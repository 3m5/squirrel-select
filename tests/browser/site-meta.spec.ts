import { readdirSync, readFileSync } from 'node:fs'
import { join, posix, sep } from 'node:path'
import { type Page } from '@playwright/test'
import { test, expect, project, routeSite } from './fixtures.ts'

// markup and metadata do not depend on the engine
test.beforeEach(() => test.skip(project() !== 'chromium', 'engine independent'))

const root = join(process.cwd(), '_site')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const home: string = pkg.homepage
const all = readdirSync(root, { recursive: true, encoding: 'utf8' }).map(f => f.split(sep).join('/'))
const layoutPages = all.filter(f => f.endsWith('.html') && !f.startsWith('examples/') && f !== '404.html').sort()
const docsPages = layoutPages.filter(f => f.startsWith('docs/'))
const canonicalUrl = (page: string) => home + page.replace(/(^|\/)index\.html$/, '$1')

const meta = (page: Page) => page.evaluate(() => {
  const value = (selector: string, attribute = 'content') => document.querySelector(selector)?.getAttribute(attribute) ?? null
  return {
    title: document.title,
    description: value('meta[name="description"]'),
    robots: value('meta[name="robots"]'),
    canonical: value('link[rel="canonical"]', 'href'),
    ogUrl: value('meta[property="og:url"]'),
    ogTitle: value('meta[property="og:title"]'),
    ogDescription: value('meta[property="og:description"]'),
    ogType: value('meta[property="og:type"]'),
    ogSiteName: value('meta[property="og:site_name"]'),
    ogImage: value('meta[property="og:image"]'),
    ogImageWidth: value('meta[property="og:image:width"]'),
    ogImageHeight: value('meta[property="og:image:height"]'),
    ogImageAlt: value('meta[property="og:image:alt"]'),
    ogLocale: value('meta[property="og:locale"]'),
    twitterCard: value('meta[name="twitter:card"]'),
    alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(l => `${l.getAttribute('hreflang')} ${l.getAttribute('href')}`).sort(),
  }
})

test('every page has title, description, canonical and social preview data', async ({ page }) => {
  const titles = new Map<string, string>()
  const descriptions = new Map<string, string>()
  for (const path of layoutPages) {
    await page.goto(path)
    const m = await meta(page)
    const where = (what: string) => `${path}: ${what}`
    expect(m.canonical, where('canonical')).toBe(canonicalUrl(path))
    expect(m.ogUrl, where('og:url')).toBe(m.canonical)
    expect(m.title, where('title pattern')).toMatch(path === 'index.html' ? /^SquirrelSelect – \S/ : /\S – SquirrelSelect$/)
    expect(m.description?.length ?? 0, where('description length')).toBeGreaterThanOrEqual(50)
    expect(m.description?.length ?? 0, where('description length')).toBeLessThanOrEqual(160)
    expect(m.ogTitle, where('og:title')).toMatch(/\S/)
    expect(m.ogDescription, where('og:description')).toMatch(/\S/)
    expect(m.ogType, where('og:type')).toBe('website')
    expect(m.ogSiteName, where('og:site_name')).toBe('SquirrelSelect')
    expect(m.twitterCard, where('twitter:card')).toBe('summary_large_image')
    expect(m.ogImage, where('og:image is absolute')).toMatch(new RegExp(`^${home}`))
    expect(all, where('og:image is built')).toContain(m.ogImage!.slice(home.length))
    expect([m.ogImageWidth, m.ogImageHeight], where('og:image size')).toEqual(['1200', '630'])
    expect(m.ogImageAlt, where('og:image:alt')).toMatch(/\S/)
    expect(m.ogLocale, where('og:locale')).toBe(path.startsWith('de/') ? 'de_DE' : 'en_US')
    expect(m.robots, where('indexable')).toBeNull()
    expect(titles.get(m.title), where(`title also used on ${titles.get(m.title)}`)).toBeUndefined()
    expect(descriptions.get(m.description!), where(`description also used on ${descriptions.get(m.description!)}`)).toBeUndefined()
    titles.set(m.title, path)
    descriptions.set(m.description!, path)
  }
  const size = readFileSync(join(root, 'assets', (await meta(page)).ogImage!.split('/assets/')[1]))
  expect(size.length, 'social card weight').toBeLessThanOrEqual(300_000)
})

test('the English and German accessibility pages point to each other', async ({ page }) => {
  const pair = ['accessibility.html', 'de/barrierefreiheit.html']
  const expected = [`de ${canonicalUrl(pair[1])}`, `en ${canonicalUrl(pair[0])}`]
  for (const path of pair) {
    await page.goto(path)
    expect((await meta(page)).alternates, path).toEqual(expected)
  }
})

test('the 404 page is not indexed and has no canonical', async ({ page }) => {
  await page.goto('404.html')
  const m = await meta(page)
  expect(m.robots).toMatch(/noindex/)
  expect(m.canonical).toBeNull()
})

test('the states page has its own slim header outside the tested area', async ({ page }) => {
  await page.goto('examples/states.html')
  const m = await meta(page)
  expect(m.description).toMatch(/\S/)
  expect(m.canonical).toBe(canonicalUrl('examples/states.html'))
  const header = page.locator('body > header')
  await expect(header).toHaveCount(1)
  await expect(page.locator('main header')).toHaveCount(0)
  const links = header.getByRole('link')
  expect(await links.count()).toBeLessThanOrEqual(3)
  expect(await links.first().getAttribute('href')).toMatch(/^\.\.\/(index\.html)?$/)
  await expect(header.locator('select')).toHaveCount(0)
  await expect(page.locator('link[href*="site.css"], script[src*="site.js"]')).toHaveCount(0)
})

test('main navigation has five entries, the version and GitHub, and marks the current page without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled: false })
  await routeSite(context)
  const page = await context.newPage()
  for (const [path, current] of [['playground.html', 'Playground'], ['docs/theming.html', 'Docs'], ['de/barrierefreiheit.html', 'Accessibility'], ['compare.html', 'Compare']]) {
    await page.goto(path)
    const nav = page.getByRole('banner').locator('nav').first()
    await expect(nav.getByRole('link')).toHaveText(['Docs', 'Examples', 'Playground', 'Compare', 'Accessibility'])
    await expect(nav.locator('[aria-current]'), path).toHaveText(current)
  }
  const banner = page.getByRole('banner')
  await expect(banner.getByRole('link', { name: new RegExp(`^v${pkg.version.replace(/\./g, '\\.')}\\b`) })).toHaveCount(1)
  await expect(banner.getByRole('link', { name: 'GitHub', exact: true }).first()).toHaveAttribute('href', 'https://github.com/3m5/squirrel-select')
  await context.close()
})

test('docs pages have an outline, previous and next in reading order, and a readable line length', async ({ page }) => {
  const nav = readFileSync('site/docs/_nav.md', 'utf8')
  const order = [...nav.matchAll(/\]\(([^)]+)\)/g)].map(m => posix.normalize(posix.join('docs', m[1]))).filter(p => p.startsWith('docs/'))
  expect(order.length).toBeGreaterThan(5)
  // below 76rem the outline is a collapsed box above the text, the open column needs a wide window
  await page.setViewportSize({ width: 1280, height: 800 })
  for (const path of docsPages) {
    await page.goto(path)
    const main = page.getByRole('main')
    const headings = await main.locator('h2[id]').evaluateAll(hs => hs.filter(h => !h.closest('nav, footer')).map(h => h.id))
    if (headings.length >= 3) {
      const outline = page.getByRole('navigation', { name: 'On this page' })
      await expect(outline, `${path}: on this page`).toHaveCount(1)
      const targets = await outline.getByRole('link').evaluateAll(as => as.map(a => decodeURIComponent((a as HTMLAnchorElement).hash.slice(1))))
      expect(targets, `${path}: one entry per section`).toEqual(headings)
    }
    const pager = page.getByRole('navigation', { name: 'Previous and next page' })
    const i = order.indexOf(path)
    expect(i, `${path} is in the docs navigation`).toBeGreaterThanOrEqual(0)
    const href = (rel: string) => pager.locator(`a[rel="${rel}"]`).evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href))
    const resolve = (p: string) => new URL(p, test.info().project.use.baseURL).href
    expect(await href('prev'), `${path}: previous`).toEqual(i > 0 ? [resolve(order[i - 1])] : [])
    expect(await href('next'), `${path}: next`).toEqual(i < order.length - 1 ? [resolve(order[i + 1])] : [])
    const widest = await main.locator('p').evaluateAll(ps => Math.max(0, ...ps.filter(p => !p.closest('nav, figure, table, footer, .tiles')).map(p => p.getBoundingClientRect().width)))
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    expect(widest, `${path}: paragraphs at most 40rem wide`).toBeLessThanOrEqual(40 * rem + 1)
  }
})

test('footer names the maker with logo and legal links on every page', async ({ page }) => {
  const company = readFileSync('LICENSE', 'utf8').match(/Copyright \(c\) \d{4}(?:[–-]\d{4})? (.+)/)?.[1].trim()
  expect(company).toBe('3m5. Media GmbH')
  for (const path of [...layoutPages, '404.html']) {
    await page.goto(path)
    const footer = page.getByRole('contentinfo')
    const maker = footer.getByRole('link', { name: /Made and maintained by 3m5\./ })
    await expect(maker, path).toHaveAttribute('href', 'https://www.3m5.de')
    const logo = maker.getByRole('img', { name: '3m5.' })
    await expect(logo).toHaveAttribute('fill', 'currentColor')
    expect((await logo.boundingBox())!.height, `${path}: logo height`).toBeGreaterThanOrEqual(16)
    await expect(footer.locator('a[href="https://www.3m5.de/impressum"]'), path).toHaveCount(1)
    await expect(footer.locator('a[href="https://www.3m5.de/datenschutz"]'), path).toHaveCount(1)
    await expect(footer, path).toContainText(company!)
  }
})

test('images below the first screen load lazily, the hero image does not', async ({ page }) => {
  for (const path of layoutPages) {
    await page.goto(path)
    const images = await page.locator('main img').evaluateAll(imgs => imgs.map(img => {
      const i = img as HTMLImageElement
      return { src: i.getAttribute('src'), top: i.getBoundingClientRect().top + scrollY, loading: i.getAttribute('loading'), decoding: i.getAttribute('decoding'), alt: i.getAttribute('alt') }
    }))
    const fold = 1.5 * page.viewportSize()!.height
    for (const img of images) {
      expect(img.alt, `${path}: ${img.src} has alt`).not.toBeNull()
      if (img.top > fold) expect([img.loading, img.decoding], `${path}: ${img.src} below the fold`).toEqual(['lazy', 'async'])
      else expect(img.loading, `${path}: ${img.src} in the first screen`).not.toBe('lazy')
    }
  }
})

test('the hero picture comes from the snapshot test and its caption names the limits', async ({ page }) => {
  await page.goto('index.html')
  const figure = page.getByRole('main').locator('figure').filter({ has: page.locator('picture') }).first()
  await expect(figure.locator('img')).toHaveAttribute('src', /assets\/ci\/hero-dark-chromium-linux\.png$/)
  await expect(figure.locator('source')).toHaveAttribute('srcset', /assets\/ci\/hero-light-chromium-linux\.png$/)
  await expect(figure.locator('img')).toHaveAttribute('alt', /\S/)
  await expect(figure.locator('img')).not.toHaveAttribute('loading', 'lazy')
  const caption = figure.locator('figcaption')
  await expect(caption).toContainText('Firefox')
  await expect(caption).toContainText(/phone/i)
})
