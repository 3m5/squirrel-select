import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { test, expect, project } from './fixtures.ts'

// checks on the built files only, so one project is enough
test.beforeEach(() => test.skip(project() !== 'chromium', 'reads files only'))

const root = join(process.cwd(), '_site')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const home: string = pkg.homepage
const files = () => readdirSync(root, { recursive: true, encoding: 'utf8' }).map(f => f.split(sep).join('/'))
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const layoutPages = () => files().filter(f => f.endsWith('.html') && !f.startsWith('examples/') && f !== '404.html').sort()

/** maps an absolute site URL to the built file it should serve, or undefined outside the site */
function fileForUrl(url: string) {
  if (!url.startsWith(home)) return
  let path = decodeURIComponent(new URL(url).pathname).slice(new URL(home).pathname.length)
  if (path === '' || path.endsWith('/')) path += 'index.html'
  return path
}

const canonicalUrl = (page: string) => home + page.replace(/(^|\/)index\.html$/, '$1')

function imageSize(file: string) {
  const b = readFileSync(file)
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length;) {
      const marker = b[i + 1]
      if (marker >= 0xc0 && marker <= 0xc3) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) }
      i += 2 + b.readUInt16BE(i + 2)
    }
  }
  if (file.endsWith('.svg')) return
  throw new Error(`unknown image format: ${file}`)
}

test('llms.txt is small, follows the format and links only to built pages', () => {
  const llms = read('llms.txt')
  expect(statSync(join(root, 'llms.txt')).size).toBeLessThanOrEqual(10_000)
  expect(llms).toMatch(/^# SquirrelSelect\n/)
  expect(llms).toMatch(/^> \S/m)
  expect(llms).toContain(pkg.name)
  expect(llms).toContain(`${pkg.name}/squirrel-select.css`)
  expect(llms).toMatch(/class="sqs"|`sqs`/)
  const links = [...llms.matchAll(/https?:\/\/[^\s)>`"]+/g)].map(m => m[0]).filter(u => u.startsWith(home))
  expect(links.length).toBeGreaterThan(5)
  expect(links.map(fileForUrl).filter(f => !f || !existsSync(join(root, f)))).toEqual([])
})

test('every absolute link to the site in the repository points to a built page', () => {
  const sources = ['README.md', 'package.json', ...readdirSync('site', { recursive: true, encoding: 'utf8' })
    .map(f => join('site', f)).filter(f => /\.(md|html|txt)$/.test(f))]
  const missing = sources.flatMap(source => [...readFileSync(source, 'utf8').matchAll(/https:\/\/3m5\.github\.io\/squirrel-select\/[^\s)"'<>`,]*/g)]
    .map(m => m[0].replace(/[.:;]$/, ''))
    .filter(url => { const file = fileForUrl(url); return !file || !existsSync(join(root, file)) })
    .map(url => `${source}: ${url}`))
  expect(missing).toEqual([])
})

test('width and height of every image match the image file', () => {
  const wrong: string[] = []
  for (const page of files().filter(f => f.endsWith('.html'))) {
    for (const tag of read(page).match(/<(img|source)\b[^>]*>/g) ?? []) {
      const src = tag.match(/\s(?:src|srcset)="([^"]+)"/)?.[1]
      if (!src || /^(data:|https?:)/.test(src)) continue
      const file = join(root, posix.normalize(posix.join(posix.dirname(page), src)))
      if (!existsSync(file)) { wrong.push(`${page}: ${src} missing`); continue }
      const size = imageSize(file)
      if (!size) continue
      const width = Number(tag.match(/\swidth="(\d+)"/)?.[1])
      const height = Number(tag.match(/\sheight="(\d+)"/)?.[1])
      if (!width || !height) { wrong.push(`${page}: ${src} without width and height`); continue }
      // 2x images may declare their CSS size, so compare the aspect ratio and allow integer scale factors
      const scale = size.width / width
      if (!Number.isInteger(scale) || size.height !== height * scale) wrong.push(`${page}: ${src} is ${size.width}×${size.height}, declared ${width}×${height}`)
    }
  }
  expect(wrong).toEqual([])
})

test('sitemap lists every page once under its canonical URL', () => {
  const xml = read('sitemap.xml')
  expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  const expected = [...layoutPages(), 'examples/states.html'].map(canonicalUrl).sort()
  expect([...locs].sort()).toEqual(expected)
  for (const lastmod of xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) expect(lastmod[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('docs pages link to their source on GitHub and show a real date only with full history', () => {
  const docs = layoutPages().filter(f => f.startsWith('docs/'))
  expect(docs.length).toBeGreaterThan(5)
  let shallow = true
  try { shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() !== 'false' } catch { /* no repository */ }
  const dates = new Set<string>()
  for (const page of docs) {
    const html = read(page)
    const edit = html.match(/href="https:\/\/github\.com\/3m5\/squirrel-select\/edit\/main\/([^"]+)"/)?.[1]
    expect(edit, `${page}: edit link`).toBeTruthy()
    expect(existsSync(edit!), `${page}: ${edit} exists`).toBe(true)
    const date = html.match(/<time datetime="([^"]+)"/)?.[1]
    if (shallow) { expect(date, `${page}: no date from a shallow history`).toBeUndefined(); continue }
    expect(date, `${page}: last updated`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(date!).getTime()).toBeLessThanOrEqual(Date.now())
    dates.add(date!)
  }
  if (!shallow) expect(dates.size, 'pages carry their own dates, not the date of the last commit').toBeGreaterThan(1)
})

test('claims on the site match their sources', () => {
  const index = read('index.html')
  const budget = JSON.parse(readFileSync('size-budget.json', 'utf8'))['dist/squirrel-select.css'].budget
  if (/under 3 kB/i.test(index)) expect(budget, 'size budget behind "under 3 kB"').toBeLessThanOrEqual(3000)
  expect(Object.keys(pkg.dependencies ?? {}).concat(Object.keys(pkg.peerDependencies ?? {})), 'no dependencies').toEqual([])
  expect(Object.keys(pkg.exports).filter(k => !/\.css$|package\.json$/.test(k)), 'only CSS is exported').toEqual([])
  const config = readFileSync('playwright.config.ts', 'utf8')
  for (const engine of ['chromium', 'firefox', 'webkit']) expect(config, `${engine} is tested`).toContain(`name: '${engine}'`)
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
  expect(ci).toMatch(/^\s+push:/m)
  expect(ci).toMatch(/^\s+pull_request:/m)
  const gzip = gzipSync(readFileSync('dist/squirrel-select.css'), { level: 9 }).length
  expect(read('compare.html'), 'size on the compare page').toContain(`${(gzip / 1000).toFixed(1)} kB CSS`)
  expect(index, 'screen readers are named only as tested').not.toMatch(/VoiceOver/)
  expect(index, 'the start page does not name other libraries').not.toMatch(/Tom Select|Choices\.js|Slim Select|daisyUI|When to pick/i)
})
