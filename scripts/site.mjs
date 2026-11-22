import { execFileSync } from 'node:child_process'
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, posix, relative } from 'node:path'
import { Marked } from 'marked'
/** @import { Tokens } from 'marked' */

const out = '_site'
const shots = 'tests/browser/screenshots.spec.ts-snapshots'
const docsNav = 'site/docs/_nav.md'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
/** @type {string} */
const base = pkg.homepage
const repo = 'https://github.com/3m5/squirrel-select'
// served for every unknown URL at any depth, so its links cannot be relative
const notFound = '404.html'
const notListed = new Set([notFound, 'examples/hero.html'])

/** @param {string} text */
const slug = text => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const marked = new Marked({
  renderer: {
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens)
      return depth === 1 ? `<h1>${html}</h1>\n` : `<h${depth} id="${slug(html)}">${html}</h${depth}>\n`
    },
  },
})

/** @param {string} md */
const plain = md => marked.parseInline(md, { async: false }).replace(/<[^>]+>/g, '')
/** @param {string} s */
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/**
 * @typedef {{ lang: string, title: string, description: string, ogTitle?: string, ogDescription?: string, head: string, main: string }} Page
 * @typedef {{ href: string, text: string }} Link
 */

/** "On this page" from the h2 headings that have an id. @param {{ id: string, text: string }[]} items @param {string} lang */
function toc(items, lang) {
  const title = lang === 'de' ? 'Auf dieser Seite' : 'On this page'
  const list = items.map(item => `<li><a href="#${item.id}">${item.text}</a></li>`).join('\n')
  return `<nav class="toc" aria-labelledby="toc-title">\n<h2 id="toc-title">${title}</h2>\n<ul>\n${list}\n</ul>\n</nav>\n`
}

/** @param {string} src @param {string} file @param {string[]} errors @returns {Page | null} */
function fromHtml(src, file, errors) {
  const mains = src.match(/<main\b/g)?.length ?? 0
  if (mains !== 1) {
    errors.push(`${file}: needs exactly one <main>, found ${mains}`)
    return null
  }
  const start = src.indexOf('<main')
  const end = src.indexOf('</main>') + '</main>'.length
  if (!/^<main\b[^>]*\bid="main"/.test(src.slice(start))) errors.push(`${file}: <main> needs id="main"`)
  if (src.slice(end).trim()) errors.push(`${file}: content after </main>`)
  let head = src.slice(0, start)
  /** @param {RegExp} re */
  const take = re => {
    const value = head.match(re)?.[1]
    head = head.replace(re, '')
    return value
  }
  const title = take(/<title>([^<]*)<\/title>\s*/)
  const description = take(/<meta name="description" content="([^"]*)">\s*/)
  const lang = take(/<meta name="page-lang" content="([^"]*)">\s*/) ?? 'en'
  const ogTitle = take(/<meta name="og-title" content="([^"]*)">\s*/)
  const ogDescription = take(/<meta name="og-description" content="([^"]*)">\s*/)
  if (!title?.trim()) errors.push(`${file}: missing <title>`)
  if (!description?.trim()) errors.push(`${file}: missing <meta name="description">`)
  let main = src.slice(start, end)
  if (/^<main\b[^>]*\sdata-toc\b/.test(main)) {
    const items = [...main.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(m => ({ id: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }))
    main = main.replace(/\sdata-toc\b/, ' class="doc has-toc"').replace(/(\s*)<section\b/, `\n${toc(items, lang)}$1<section`)
  }
  return { lang, title: title ?? '', description: description ?? '', ogTitle, ogDescription, head: head.trim(), main }
}

/** Width and height from the PNG header, so screenshots never carry stale sizes. @param {string} file */
function pngSize(file) {
  const header = Buffer.alloc(24)
  const fd = openSync(file, 'r')
  readSync(fd, header, 0, 24, 0)
  closeSync(fd)
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) }
}

/** @param {string} html */
function withImageSizes(html) {
  return html.replace(/<img\b[^>]*\bsrc="[^"]*assets\/ci\/([^"]+\.png)"[^>]*>/g, (tag, name) => {
    const file = join(shots, name)
    if (!existsSync(file)) return tag
    const { width, height } = pngSize(file)
    return tag.replace(/\s(width|height)="[^"]*"/g, '').replace(/^<img/, `<img width="${width}" height="${height}"`)
  })
}

/** @param {string[]} args */
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim()

// a shallow clone knows one commit, so every page would show the same, wrong date
let fullHistory = false
try { fullHistory = git(['rev-parse', '--is-shallow-repository']) === 'false' } catch { /* no repository */ }

/** @param {string} file path in site/ */
function lastUpdated(file) {
  if (!fullHistory) return ''
  try {
    // a file that is not committed yet has no history; its own change date stands in
    const iso = git(['log', '-1', '--follow', '--format=%cs', '--', file])
      || statSync(file).mtime.toISOString().slice(0, 10)
    const text = new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    return ` <span>Last updated <time datetime="${iso}">${text}</time></span>`
  } catch {
    return ''
  }
}

/** @param {string} src @param {string} file @param {string[]} errors @param {string} page @param {Link[]} order @returns {Page} */
function fromMarkdown(src, file, errors, page, order) {
  // readers copy examples, and an option without text is unnamed in native pickers
  if (/<option\b[^>]*>\s*<\/option>/.test(src)) errors.push(`${file}: example with an empty <option>`)
  const tokens = marked.lexer(src)
  const title = /** @type {Tokens.Heading | undefined} */ (tokens.find(t => t.type === 'heading' && t.depth === 1))?.text
  const description = /** @type {Tokens.Paragraph | undefined} */ (tokens.find(t => t.type === 'paragraph'))?.text
  if (!title) errors.push(`${file}: missing # heading`)
  if (!description) errors.push(`${file}: missing first paragraph`)
  // wide tables scroll in a focusable region even without JS, named after the nearest heading
  let label = 'Table'
  /** @type {{ id: string, text: string }[]} */
  const sections = []
  const blocks = tokens.map(token => {
    if (token.type === 'heading') label = plain(token.text)
    if (token.type === 'heading' && token.depth === 2) sections.push({ id: slug(plain(token.text)), text: plain(token.text) })
    if (token.type !== 'table') return token
    const html = `<div class="table-scroll" role="region" tabindex="0" aria-label="${label}">\n${marked.parser([token])}</div>\n`
    return /** @type {Tokens.HTML} */ ({ type: 'html', block: true, pre: false, raw: html, text: html })
  })
  let body = withImageSizes(marked.parser(blocks))
  const hasToc = sections.length >= 3
  if (hasToc) body = body.replace('</p>\n', `</p>\n${toc(sections, 'en')}`)

  const own = page.slice('docs/'.length)
  const up = '../'.repeat(own.split('/').length - 1)
  const index = order.findIndex(link => posix.normalize(link.href) === own)
  /** @param {Link | undefined} link @param {string} rel @param {string} word */
  const pager = (link, rel, word) => link ? `<a href="${posix.normalize(up + link.href)}" rel="${rel}"><span>${word}</span> ${link.text}</a>` : '<span></span>'
  const foot = `<footer class="doc-foot">
<p class="doc-meta"><a href="${repo}/edit/main/${file}">Edit this page on GitHub</a>${lastUpdated(file)}</p>
<nav class="pager" aria-label="Previous and next page">${pager(index > 0 ? order[index - 1] : undefined, 'prev', 'Previous')}${pager(index >= 0 ? order[index + 1] : undefined, 'next', 'Next')}</nav>
</footer>\n`
  return {
    lang: 'en',
    title: `${plain(title ?? '')} – SquirrelSelect`,
    description: plain(description ?? ''),
    head: '',
    main: `<main id="main" class="doc docs${hasToc ? ' has-toc' : ''}">\n${body}${foot}</main>`,
  }
}

/** @param {string} list links relative to docs/ @param {string} page */
function subnav(list, page) {
  if (!list || !page.startsWith('docs/')) return ''
  const own = page.slice('docs/'.length)
  const up = '../'.repeat(own.split('/').length - 1)
  const html = list.replace(/href="([^"]*)"/g, (match, href) => {
    if (/^([a-z]+:|#|\/)/.test(href)) return match
    return `href="${posix.normalize(up + href)}"${posix.normalize(href) === own ? ' aria-current="page"' : ''}`
  })
  return `<nav aria-label="Documentation">\n${html}</nav>`
}

/** @param {string} page */
const pageUrl = page => base + page.replace(/(^|\/)index\.html$/, '$1')

/** @param {string} page @param {Page} parts */
function meta(page, parts) {
  if (page === notFound) return '<meta name="robots" content="noindex">'
  const url = pageUrl(page)
  const languages = ['accessibility.html', 'de/barrierefreiheit.html'].includes(page)
    ? [`<link rel="alternate" hreflang="en" href="${base}accessibility.html">`, `<link rel="alternate" hreflang="de" href="${base}de/barrierefreiheit.html">`]
    : []
  return [
    `<link rel="canonical" href="${url}">`,
    ...languages,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="SquirrelSelect">',
    `<meta property="og:title" content="${parts.ogTitle ?? attr(parts.title.replace(/ – SquirrelSelect$/, ''))}">`,
    `<meta property="og:description" content="${parts.ogDescription ?? attr(parts.description)}">`,
    `<meta property="og:locale" content="${parts.lang === 'de' ? 'de_DE' : 'en_US'}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${base}assets/og-card.jpg">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="SquirrelSelect: Keep the select. Change the look. 0 kB JavaScript, under 3 kB CSS gzipped, 0 dependencies, 3 engines tested on every change. Next to it, an open select styled in navy and cyan. Made by 3m5.">',
    '<meta name="twitter:card" content="summary_large_image">',
  ].join('\n')
}

/** @param {string} nav @param {string} page */
function markCurrent(nav, page) {
  const current = nav.replaceAll(`href="{{root}}${page}"`, `href="{{root}}${page}" aria-current="page"`)
  const section = ['docs/', 'de/'].find(prefix => page.startsWith(prefix))
  if (!section) return current
  // pages below a section, such as docs/theming.html, mark their section
  return current.replace(/<a [^>]*data-section="([^"]+)"[^>]*>/g, (tag, value) =>
    value === section && !tag.includes('aria-current') ? tag.replace('data-section', 'aria-current="true" data-section') : tag)
}

/** @param {string[]} pages */
function sitemap(pages) {
  const urls = pages.filter(page => !notListed.has(page)).sort().map(page => `  <url><loc>${pageUrl(page)}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function buildSite() {
  /** @type {string[]} */
  const errors = []
  const layout = readFileSync('site/_layout.html', 'utf8')
  const list = existsSync(docsNav) ? marked.parse(readFileSync(docsNav, 'utf8'), { async: false }) : ''
  /** @type {Link[]} links in reading order, for previous and next */
  const order = [...list.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(m => ({ href: m[1], text: m[2] })).filter(link => !/^([a-z]+:|\.\.)/.test(link.href))
  rmSync(out, { recursive: true, force: true })
  cpSync('dist', join(out, 'dist'), { recursive: true })
  cpSync(shots, join(out, 'assets/ci'), { recursive: true })

  /** @type {string[]} */
  const pages = []
  const files = readdirSync('site', { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative('site', join(entry.parentPath, entry.name)))
  for (const file of files.sort()) {
    const src = join('site', file)
    if (basename(file).startsWith('_') || file.startsWith('dist/')) continue
    const page = file.replace(/\.md$/, '.html')
    mkdirSync(dirname(join(out, page)), { recursive: true })
    if (page.endsWith('.html')) pages.push(page)
    if (file.startsWith('examples/') || file.startsWith('assets/') || !/\.(html|md)$/.test(file)) {
      cpSync(src, join(out, file))
      continue
    }
    const text = readFileSync(src, 'utf8')
    const parts = file.endsWith('.md') ? fromMarkdown(text, src, errors, page, order) : fromHtml(text, src, errors)
    if (!parts) continue
    /** @type {Record<string, string>} */
    const values = {
      ...parts,
      root: page === notFound ? new URL(base).pathname : '../'.repeat(page.split('/').length - 1),
      page,
      subnav: subnav(list, page),
      meta: meta(page, parts),
      version: pkg.version,
    }
    const html = layout
      .replace(/<nav\b[\s\S]*?<\/nav>/g, nav => markCurrent(nav, page))
      .replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (Object.hasOwn(values, key)) return values[key]
        errors.push(`site/_layout.html: unknown placeholder ${match}`)
        return match
      })
    writeFileSync(join(out, page), html)
  }
  writeFileSync(join(out, 'sitemap.xml'), sitemap(pages))
  if (errors.length) throw new Error([...new Set(errors)].join('\n'))
}

if (import.meta.main) {
  try {
    buildSite()
    console.log(`site written to ${out}/`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
