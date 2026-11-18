import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, posix, relative } from 'node:path'
import { marked } from 'marked'
/** @import { Tokens } from 'marked' */

const out = '_site'
const shots = 'tests/browser/screenshots.spec.ts-snapshots'
const docsNav = 'site/docs/_nav.md'

/** @param {string} md */
const plain = md => marked.parseInline(md, { async: false }).replace(/<[^>]+>/g, '')

/** @param {string} src @param {string} file @param {string[]} errors */
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
  if (!title?.trim()) errors.push(`${file}: missing <title>`)
  if (!description?.trim()) errors.push(`${file}: missing <meta name="description">`)
  return { lang, title: title ?? '', description: description ?? '', head: head.trim(), main: src.slice(start, end) }
}

/** @param {string} src @param {string} file @param {string[]} errors */
function fromMarkdown(src, file, errors) {
  // readers copy examples, and an option without text is unnamed in native pickers
  if (/<option\b[^>]*>\s*<\/option>/.test(src)) errors.push(`${file}: example with an empty <option>`)
  const tokens = marked.lexer(src)
  const title = /** @type {Tokens.Heading | undefined} */ (tokens.find(t => t.type === 'heading' && t.depth === 1))?.text
  const description = /** @type {Tokens.Paragraph | undefined} */ (tokens.find(t => t.type === 'paragraph'))?.text
  if (!title) errors.push(`${file}: missing # heading`)
  if (!description) errors.push(`${file}: missing first paragraph`)
  // wide tables scroll in a focusable region even without JS, named after the nearest heading
  let label = 'Table'
  const blocks = tokens.map(token => {
    if (token.type === 'heading') label = plain(token.text)
    if (token.type !== 'table') return token
    const html = `<div class="table-scroll" role="region" tabindex="0" aria-label="${label}">\n${marked.parser([token])}</div>\n`
    return /** @type {Tokens.HTML} */ ({ type: 'html', block: true, pre: false, raw: html, text: html })
  })
  return { lang: 'en', title: `${plain(title ?? '')} – SquirrelSelect`, description: plain(description ?? ''), head: '', main: `<main id="main">\n${marked.parser(blocks)}</main>` }
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

export function buildSite() {
  /** @type {string[]} */
  const errors = []
  const layout = readFileSync('site/_layout.html', 'utf8')
  const list = existsSync(docsNav) ? marked.parse(readFileSync(docsNav, 'utf8'), { async: false }) : ''
  rmSync(out, { recursive: true, force: true })
  cpSync('dist', join(out, 'dist'), { recursive: true })
  cpSync(shots, join(out, 'assets/ci'), { recursive: true })

  const files = readdirSync('site', { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative('site', join(entry.parentPath, entry.name)))
  for (const file of files.sort()) {
    const src = join('site', file)
    if (basename(file).startsWith('_') || file.startsWith('dist/')) continue
    const page = file.replace(/\.md$/, '.html')
    mkdirSync(dirname(join(out, page)), { recursive: true })
    if (file.startsWith('examples/') || file.startsWith('assets/') || !/\.(html|md)$/.test(file)) {
      cpSync(src, join(out, file))
      continue
    }
    const text = readFileSync(src, 'utf8')
    const parts = file.endsWith('.md') ? fromMarkdown(text, src, errors) : fromHtml(text, src, errors)
    if (!parts) continue
    /** @type {Record<string, string>} */
    const values = { ...parts, root: '../'.repeat(page.split('/').length - 1), page, subnav: subnav(list, page) }
    const html = layout
      .replace(/<nav\b[\s\S]*?<\/nav>/g, nav => nav.replaceAll(`href="{{root}}${page}"`, `href="{{root}}${page}" aria-current="page"`))
      .replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (Object.hasOwn(values, key)) return values[key]
        errors.push(`site/_layout.html: unknown placeholder ${match}`)
        return match
      })
    writeFileSync(join(out, page), html)
  }
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
