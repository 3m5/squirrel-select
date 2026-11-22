import AxeBuilder from '@axe-core/playwright'
import { type Locator, type Page } from '@playwright/test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { test as base, expect, project, routeSite } from './fixtures.ts'

const root = join(process.cwd(), '_site')
const origin = 'http://sqs.test'
const subpath = '/squirrel-select/'
const pages = existsSync(root)
  ? readdirSync(root, { recursive: true, encoding: 'utf8' }).map(f => f.split(sep).join('/')).filter(f => f.endsWith('.html')).sort()
  : []
const placeholder = /\{\{(lang|title|description|head|main|root|page)\}\}/
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

function fileFor(url: URL) {
  if (url.origin !== origin || !url.pathname.startsWith(subpath)) return
  let path = decodeURIComponent(url.pathname.slice(subpath.length))
  if (path === '' || path.endsWith('/')) path += 'index.html'
  const file = join(root, path)
  return existsSync(file) && statSync(file).isFile() ? file : undefined
}

const test = base.extend<{ problems: string[] }>({
  problems: [async ({ context }, use) => {
    const problems: string[] = []
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin === origin) return route.fallback()
      problems.push(`external request: ${url.href}`)
      return route.abort('blockedbyclient')
    })
    context.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`) })
    context.on('weberror', e => problems.push(`page error: ${e.error().message}`))
    context.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`) })
    context.on('requestfailed', r => { if (new URL(r.url()).origin === origin) problems.push(`failed: ${r.url()} (${r.failure()?.errorText})`) })
    await use(problems)
  }, { auto: true }],
})

const desktop = () => ['chromium', 'firefox', 'webkit'].includes(project())
const withLayout = (path: string) => !path.startsWith('examples/')

async function visit(page: Page, path: string) {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(200)
  await page.evaluate(() => document.fonts.ready)
}

async function axe(page: Page) {
  const builder = new AxeBuilder({ page }).withTags(tags)
  // Firefox keeps <button><selectedcontent> in the DOM but neither renders nor fills it without the prefs
  if (project() === 'firefox') builder.exclude('.sqs > button')
  const { violations } = await builder.analyze()
  return violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)
}

const themeSwitch = (page: Page) => page.getByRole('banner').locator('select')

async function chooseTheme(page: Page, name: RegExp) {
  await expect(themeSwitch(page), 'appearance switch in the header').toHaveCount(1)
  const value = await themeSwitch(page).locator('option', { hasText: name }).getAttribute('value')
  await themeSwitch(page).selectOption(value ?? '')
}

// computed colours can come back as oklch() or color(), the canvas turns any of them into sRGB
const backgroundLightness = (page: Page) => page.evaluate(() => {
  const transparent = (c: string) => c === 'transparent' || c === 'rgba(0, 0, 0, 0)'
  const body = getComputedStyle(document.body).backgroundColor
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = transparent(body) ? getComputedStyle(document.documentElement).backgroundColor : body
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
})

const colorScheme = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)

test('the site is built', () => {
  test.skip(project() !== 'chromium', 'checks files only')
  expect(pages, 'run npm run site first').toEqual(expect.arrayContaining([
    'index.html', 'playground.html', 'accessibility.html', 'de/barrierefreiheit.html', 'docs/index.html', 'examples/states.html', '404.html',
  ]))
  const all = readdirSync(root, { recursive: true, encoding: 'utf8' }).map(f => f.split(sep).join('/'))
  expect(all).toEqual(expect.arrayContaining(['llms.txt', 'sitemap.xml']))
  expect(all.filter(f => f.endsWith('.md') || f.endsWith('_layout.html'))).toEqual([])
})

for (const path of pages) {
  test.describe(path, () => {
    test('loads without errors, failed or external requests', async ({ page, problems }) => {
      await visit(page, path)
      await page.waitForLoadState('networkidle')
      if (!desktop()) expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'horizontal scrolling').toBeLessThanOrEqual(0)
      expect(problems).toEqual([])
    })

    test('axe finds no violations in light and dark', async ({ page }) => {
      test.skip(!desktop(), 'same markup as on desktop')
      // colour transitions would otherwise be measured halfway after switching the theme
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const scheme of ['light', 'dark'] as const) {
        if (withLayout(path)) {
          await visit(page, path)
          await chooseTheme(page, new RegExp(scheme, 'i'))
        } else {
          await page.emulateMedia({ colorScheme: scheme })
          await visit(page, path)
        }
        expect(await axe(page), scheme).toEqual([])
      }
    })

    test('one h1, title and description, every internal link and image resolves', async ({ page }) => {
      test.skip(project() !== 'chromium', 'engine independent')
      const source = readFileSync(join(root, path), 'utf8')
      expect(source.match(placeholder)?.[0], 'unfilled layout placeholder').toBeUndefined()
      await visit(page, path)
      await expect(page.locator('h1')).toHaveCount(1)
      expect(await page.locator('title').textContent()).toMatch(/\S/)
      if (withLayout(path)) await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/)

      const refs = await page.evaluate(() => [
        ...[...document.querySelectorAll('a[href], link[href]:not([rel="canonical"], [rel="alternate"])')].map(el => ({ tag: el.localName, raw: el.getAttribute('href')!, url: (el as HTMLAnchorElement).href })),
        ...[...document.querySelectorAll('img[src], script[src], source[src], iframe[src], video[src]')].map(el => ({ tag: el.localName, raw: el.getAttribute('src')!, url: (el as HTMLImageElement).src })),
      ])
      const broken: string[] = []
      for (const { tag, raw, url: href } of refs) {
        // the 404 page is served at any depth, so only it may use paths from the domain root
        const rootAbsoluteAllowed = path === '404.html' && raw.startsWith(subpath)
        if (/^\/(?!\/)/.test(raw) && !rootAbsoluteAllowed) { broken.push(`${tag} ${raw}: root-absolute path`); continue }
        const url = new URL(href)
        if (['javascript:', 'mailto:', 'data:'].includes(url.protocol)) continue
        if (url.origin !== origin) {
          if (tag !== 'a') broken.push(`${tag} ${raw}: external resource`)
          continue
        }
        const file = fileFor(url)
        if (!file) { broken.push(`${tag} ${raw}: not found`); continue }
        const id = decodeURIComponent(url.hash.slice(1))
        if (!id || !file.endsWith('.html')) continue
        const target = file === join(root, path) ? await page.content() : readFileSync(file, 'utf8')
        if (!target.includes(`id="${id}"`)) broken.push(`${tag} ${raw}: no element with id "${id}"`)
      }
      expect(broken).toEqual([])
    })

    if (withLayout(path)) {
      test('skip link is the first tab stop and moves focus to the main content', async ({ page }) => {
        test.skip(!desktop(), 'keyboard')
        await visit(page, path)
        await page.keyboard.press('Tab')
        const skip = page.locator(':focus')
        await expect(skip).toHaveAttribute('href', '#main')
        const box = await skip.boundingBox()
        expect(box && box.width > 1 && box.height > 1 && box.y >= 0, 'visible when focused').toBe(true)
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(/#main$/)
        const inMain = () => page.evaluate(() => !!document.getElementById('main')?.contains(document.activeElement))
        if (!(await inMain())) await page.keyboard.press('Tab')
        expect(await inMain(), 'focus inside main').toBe(true)
      })
    }
  })
}

test('the "in your browser" line names the path the stylesheet takes', async ({ page }) => {
  await visit(page, 'index.html')
  const appearance = await page.getByRole('main').locator('select.sqs').first().evaluate(el => getComputedStyle(el).appearance)
  const expected = appearance === 'base-select' ? 'base' : desktop() ? 'fallback' : 'touch'
  await expect(page.locator('#path-name')).toHaveAttribute('data-path', expected)
  await expect(page.locator('#path-name')).toHaveText(/\S/)
})

test('without a stored choice the page follows the system colour scheme, with and without JavaScript', async ({ browser }) => {
  test.skip(project() !== 'chromium', 'one engine is enough for the default')
  for (const javaScriptEnabled of [true, false]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled, colorScheme })
      await routeSite(context)
      const page = await context.newPage()
      await visit(page, 'index.html')
      const lightness = await backgroundLightness(page)
      expect(colorScheme === 'dark' ? lightness < 0.5 : lightness > 0.5, `${colorScheme}, JavaScript ${javaScriptEnabled}`).toBe(true)
      if (javaScriptEnabled) await expect(themeSwitch(page).locator('option:checked')).toHaveText(/system/i)
      await context.close()
    }
  }
})

test('appearance switch sets the colour scheme of the page', async ({ page, problems }) => {
  test.skip(!desktop(), 'one switch for all devices')
  await visit(page, 'index.html')
  await expect(themeSwitch(page)).toHaveCount(1)
  await expect(themeSwitch(page)).toHaveAccessibleName(/\S/)

  await chooseTheme(page, /dark/i)
  expect(await colorScheme(page)).toBe('dark')
  expect(await backgroundLightness(page)).toBeLessThan(0.5)

  await chooseTheme(page, /light/i)
  expect(await colorScheme(page)).toBe('light')
  expect(await backgroundLightness(page)).toBeGreaterThan(0.5)

  await visit(page, 'docs/index.html')
  expect(await colorScheme(page), 'choice survives a page change').toBe('light')
  await expect(themeSwitch(page).locator('option:checked')).toHaveText(/light/i)

  await chooseTheme(page, /system/i)
  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    const lightness = await backgroundLightness(page)
    expect(scheme === 'dark' ? lightness < 0.5 : lightness > 0.5, `system follows ${scheme}`).toBe(true)
  }
  expect(problems).toEqual([])
})

test('playground: the CSS output lists only the changed tokens', async ({ page, problems }) => {
  test.skip(!desktop(), 'one interaction test')
  await visit(page, 'playground.html')
  const main = page.getByRole('main')
  const blocks = main.locator('pre code')
  const before = await blocks.allTextContents()
  const tokens = (text: string) => [...new Set([...text.matchAll(/(--sqs-[a-z-]+)\s*:/g)].map(m => m[1]))].sort()
  const radius = () => main.locator('select.sqs').evaluateAll(els => els.map(el => getComputedStyle(el).borderTopLeftRadius).join())

  const set = (input: Locator, value: string) => input.evaluate((el: HTMLInputElement, v) => {
    el.value = v
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
  const corner = main.getByLabel(/radius|corner/i).and(page.locator('input[type="range"]')).first()
  const start = await corner.inputValue()
  const other = await corner.evaluate((el: HTMLInputElement) => {
    const step = Number(el.step) || 1
    return String(Number(el.value) + step <= Number(el.max) ? Number(el.value) + step : Number(el.value) - step)
  })
  const radiusBefore = await radius()

  await set(corner, other)
  const after = await blocks.allTextContents()
  const changed = after.map((t, i) => t !== before[i] ? i : -1).filter(i => i >= 0)
  expect(changed, 'exactly one code block reacts').toHaveLength(1)
  const output = blocks.nth(changed[0])
  expect(tokens(before[changed[0]])).toEqual([])
  expect(tokens(await output.textContent() ?? '')).toEqual(['--sqs-radius'])
  expect(await radius(), 'preview follows').not.toBe(radiusBefore)

  await set(main.getByLabel(/accent/i).and(page.locator('input[type="color"]')).first(), '#c0ffee')
  expect(tokens(await output.textContent() ?? '')).toEqual(['--sqs-accent', '--sqs-radius'])

  await set(corner, start)
  expect(tokens(await output.textContent() ?? ''), 'back to the default drops the token').toEqual(['--sqs-accent'])

  await main.getByRole('button', { name: /reset/i }).click()
  expect(tokens(await output.textContent() ?? '')).toEqual([])
  expect(problems).toEqual([])
})
