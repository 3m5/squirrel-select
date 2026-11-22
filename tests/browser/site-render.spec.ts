import AxeBuilder from '@axe-core/playwright'
import { readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { type Page, type Response } from '@playwright/test'
import { test, expect, project, routeSite } from './fixtures.ts'

const root = join(process.cwd(), '_site')
const layoutPages = readdirSync(root, { recursive: true, encoding: 'utf8' }).map(f => f.split(sep).join('/'))
  .filter(f => f.endsWith('.html') && !f.startsWith('examples/') && f !== '404.html').sort()
const chromiumOnly = () => test.skip(project() !== 'chromium', 'colours and layout rules are checked in one engine')

async function open(page: Page, path: string, scheme?: 'light' | 'dark') {
  if (scheme) await page.addInitScript(s => { try { localStorage.setItem('squirrel-select-scheme', s) } catch { /* private mode */ } }, scheme)
  await page.goto(path)
  await page.evaluate(() => document.fonts.ready)
}

const luminance = (c: number[]) => c.slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// resolves any CSS colour to sRGB by painting one canvas pixel
const toRgb = (page: Page, colors: string[]) => page.evaluate(list => list.map(c => {
  const x = document.createElement('canvas').getContext('2d')!
  x.fillStyle = c
  x.fillRect(0, 0, 1, 1)
  return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)]
}), colors)

async function pixels(page: Page, clip: { x: number, y: number, width: number, height: number }) {
  const png = await page.screenshot({ clip, fullPage: true, animations: 'disabled' })
  return page.evaluate(async b64 => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, img.width, img.height).data
    const out: number[][] = []
    for (let i = 0; i < d.length; i += 8) out.push([d[i], d[i + 1], d[i + 2]])
    return out
  }, png.toString('base64'))
}

// axe cannot judge text over gradients, images or blur and reports it as incomplete; this measures the pixels behind the text
test('text keeps its contrast over gradients and images', async ({ browser }) => {
  chromiumOnly()
  test.setTimeout(240_000)
  const failures: string[] = []
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 900 }, reducedMotion: 'reduce' })
      await routeSite(context)
      const page = await context.newPage()
      for (const path of layoutPages) {
        await open(page, path, scheme)
        const { incomplete } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
        const targets = incomplete.flatMap(r => r.nodes.map(n => n.target.join(' ')))
        for (const target of targets) {
          const el = page.locator(target).first()
          if (await el.evaluate(e => !!e.closest('select'))) continue
          const info = await el.evaluate(e => {
            const s = getComputedStyle(e)
            const rects: { x: number, y: number, width: number, height: number }[] = []
            const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              if (!n.textContent?.trim()) continue
              const range = document.createRange()
              range.selectNodeContents(n)
              for (const b of range.getClientRects()) if (b.width > 2 && b.height > 2) rects.push({ x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height })
            }
            const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700)
            return { color: s.color, rects, need: large ? 3 : 4.5, text: (e.textContent ?? '').trim().slice(0, 40) }
          })
          const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])
          info.rects = info.rects.filter(r => r.x >= 0 && r.y >= 0 && r.x + r.width <= size[0] && r.y + r.height <= size[1])
          if (!info.rects.length) continue
          const [fg] = await toRgb(page, [info.color])
          const style = await page.addStyleTag({ content: `${target}, ${target} * { color: transparent !important; text-decoration-color: transparent !important; text-shadow: none !important }` })
          let worst = Infinity
          for (const clip of info.rects) for (const px of await pixels(page, clip)) worst = Math.min(worst, ratio(fg, px))
          await style.evaluate(s => (s as Element).remove())
          if (worst < info.need) failures.push(`${path} ${scheme} ${width}px "${info.text}": ${worst.toFixed(2)} < ${info.need}`)
        }
      }
      await context.close()
    }
  }
  expect(failures).toEqual([])
})

test('each example theme in the live demo keeps text, borders and focus ring readable on its card', async ({ page }) => {
  chromiumOnly()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const failures: string[] = []
  for (const scheme of ['light', 'dark'] as const) {
    await open(page, 'index.html', scheme)
    const themes = await page.locator('input[name="theme"]').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))
    expect(themes.length).toBeGreaterThanOrEqual(3)
    for (const theme of themes) {
      await page.locator(`input[name="theme"][value="${theme}"]`).evaluate(e => (e as HTMLInputElement).click())
      const card = page.locator('figure:has(select.sqs)').filter({ has: page.locator('#theme-target') })
      const colors = await card.evaluate(figure => {
        const surface = getComputedStyle(figure).backgroundColor
        const texts = [...figure.querySelectorAll('figcaption *, label, .error, code')].filter(e => !e.closest('select')).map(e => ({ what: `${e.localName} "${(e.textContent ?? '').trim().slice(0, 24)}"`, color: getComputedStyle(e).color }))
        const fields = [...figure.querySelectorAll('select')].filter(s => !s.disabled).map(s => ({ what: `#${s.id}`, border: getComputedStyle(s).borderTopColor, color: getComputedStyle(s).color, bg: getComputedStyle(s).backgroundColor }))
        return { surface, texts, fields }
      })
      const [surface] = await toRgb(page, [colors.surface])
      for (const t of colors.texts) {
        const [fg] = await toRgb(page, [t.color])
        if (ratio(fg, surface) < 4.5) failures.push(`${scheme} ${theme} ${t.what}: ${ratio(fg, surface).toFixed(2)}`)
      }
      for (const f of colors.fields) {
        const [border, color, bg] = await toRgb(page, [f.border, f.color, f.bg])
        if (ratio(border, surface) < 3) failures.push(`${scheme} ${theme} ${f.what} border: ${ratio(border, surface).toFixed(2)}`)
        if (ratio(color, bg) < 4.5) failures.push(`${scheme} ${theme} ${f.what} text: ${ratio(color, bg).toFixed(2)}`)
        await page.locator(f.what).focus()
        const ring = await page.locator(f.what).evaluate(e => getComputedStyle(e).outlineColor)
        const [ringRgb] = await toRgb(page, [ring])
        if (ratio(ringRgb, surface) < 3) failures.push(`${scheme} ${theme} ${f.what} focus ring: ${ratio(ringRgb, surface).toFixed(2)}`)
      }
    }
  }
  expect(failures).toEqual([])
})

const focusStop = (page: Page) => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const ringOf = (e: Element) => {
    const s = getComputedStyle(e)
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 ? s.outlineColor : s.boxShadow !== 'none' ? 'shadow' : null
  }
  // cards draw the ring on the list item around the link, visually hidden radios on their label
  let ring = getComputedStyle(el).opacity === '0' ? null : ringOf(el)
  for (let a = el.parentElement, i = 0; !ring && a && i < 3; a = a.parentElement, i++) if (a.matches(':focus-within')) ring = ringOf(a)
  // selects without the class keep the browser's own focus ring on purpose
  const native = el.matches('select:not(.sqs)')
  const bgOf = (node: Element) => {
    for (let n: Element | null = node; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!/rgba?\(0, 0, 0, 0\)|transparent/.test(c) && !/, 0\)$/.test(c)) return c }
    return getComputedStyle(document.documentElement).backgroundColor
  }
  const r = el.getBoundingClientRect()
  const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
  const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1)
  const hit = document.elementFromPoint(x, y)
  const covered = !!hit && hit !== el && !el.contains(hit) && !hit.contains(el) && (hit as HTMLLabelElement).control !== el && hit.closest('label') !== el.closest('label')
  return {
    what: `${el.localName}${el.id ? '#' + el.id : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`,
    ring, native, bg: bgOf(el.parentElement ?? el), covered, inView: r.bottom > 0 && r.top < innerHeight,
    positive: Number(el.getAttribute('tabindex')) > 0,
  }
})

test('every tab stop shows a visible focus ring and is not hidden behind other content', async ({ browser }) => {
  chromiumOnly()
  test.setTimeout(240_000)
  const failures: string[] = []
  for (const scheme of ['light', 'dark'] as const) {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 800 } })
      await routeSite(context)
      const page = await context.newPage()
      for (const path of ['index.html', 'docs/index.html', 'docs/theming.html', 'playground.html', 'accessibility.html', 'compare.html', 'nope']) {
        await open(page, path, scheme)
        const seen: string[] = []
        for (let i = 0; i < 150; i++) {
          await page.keyboard.press('Tab')
          const stop = await focusStop(page)
          if (!stop || seen.includes(stop.what)) break
          seen.push(stop.what)
          const where = `${path} ${scheme} ${width}px ${stop.what}`
          if (stop.positive) failures.push(`${where}: positive tabindex`)
          if (!stop.inView || stop.covered) failures.push(`${where}: hidden`)
          if (stop.native) continue
          if (!stop.ring) { failures.push(`${where}: no focus ring`); continue }
          if (stop.ring !== 'shadow') {
            const [ring, bg] = await toRgb(page, [stop.ring, stop.bg])
            if (ratio(ring, bg) < 3) failures.push(`${where}: ring ${ratio(ring, bg).toFixed(2)} : 1`)
          }
        }
      }
      await context.close()
    }
  }
  expect(failures).toEqual([])
})

test('the phone menu opens with the keyboard, without JavaScript, and reaches the appearance switch', async ({ browser }) => {
  chromiumOnly()
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, javaScriptEnabled })
    await routeSite(context)
    const page = await context.newPage()
    await page.goto('index.html')
    const summary = page.getByRole('banner').locator('summary')
    await expect(summary).toBeVisible()
    await expect(summary).toHaveText(/Menu/)
    const docs = page.getByRole('banner').getByRole('link', { name: 'Docs', exact: true })
    await expect(docs.filter({ visible: true })).toHaveCount(0)
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(docs.filter({ visible: true })).toHaveCount(1)
    if (javaScriptEnabled) {
      const order: string[] = []
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        order.push(await page.evaluate(() => document.activeElement?.id || (document.activeElement?.textContent ?? '').trim()))
        if (order.at(-1) === 'site-scheme') break
      }
      expect(order, 'the appearance switch follows the menu links').toContain('site-scheme')
    }
    await context.close()
  }
})

test('the 404 page works at any depth and offers a way back', async ({ page }) => {
  chromiumOnly()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const failed: string[] = []
  page.on('response', r => { if (r.status() >= 400 && r.request().resourceType() !== 'document') failed.push(`${r.status()} ${r.url()}`) })
  for (const path of ['nope', 'docs/does/not/exist.html', 'docs/recipes/react.html']) {
    for (const scheme of ['light', 'dark'] as const) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(404)
      await page.evaluate(s => { localStorage.setItem('squirrel-select-scheme', s); document.documentElement.dataset.scheme = s }, scheme)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
      await expect(page.getByRole('main').locator('a[href$="/squirrel-select/index.html"], a[href$="/squirrel-select/"]').first()).toBeVisible()
      await expect(page.getByRole('main').locator('a[href*="/docs/"]').first()).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
      expect(violations.map(v => v.id), `${path} ${scheme}`).toEqual([])
    }
  }
  expect(failed).toEqual([])
})

test('print shows the content in light colours without navigation and buttons', async ({ page }) => {
  chromiumOnly()
  await page.setViewportSize({ width: 718, height: 1000 })
  for (const path of ['index.html', 'docs/theming.html', 'accessibility.html']) {
    await open(page, path, 'dark')
    await page.emulateMedia({ media: 'print' })
    const result = await page.evaluate(() => {
      const visible = (e: Element) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 }
      const hidden = ['header nav', 'header select', 'header summary', '[data-copy]', '.layout > nav', 'nav[aria-labelledby="toc-title"], nav[aria-label="On this page"]', 'nav[aria-label="Previous and next page"]', '.beam']
        .flatMap(sel => [...document.querySelectorAll(sel)].filter(visible).map(() => sel))
      const vw = document.documentElement.clientWidth
      const wide = [...document.querySelectorAll('main *')].filter(e => visible(e) && e.getBoundingClientRect().right > vw + 1 && !e.closest('pre, .table-scroll')).length
      return { scheme: getComputedStyle(document.documentElement).colorScheme, bg: getComputedStyle(document.body).backgroundColor, ink: getComputedStyle(document.querySelector('main h1')!).color, hidden: [...new Set(hidden)], wide, h1: visible(document.querySelector('main h1')!) }
    })
    const [bg, ink] = await toRgb(page, [result.bg, result.ink])
    expect(luminance(bg), `${path}: light paper`).toBeGreaterThan(0.8)
    expect(ratio(ink, bg), `${path}: dark headings`).toBeGreaterThanOrEqual(7)
    expect(result.h1, `${path}: heading printed`).toBe(true)
    expect(result.hidden, `${path}: hidden in print`).toEqual([])
    expect(result.wide, `${path}: nothing wider than the paper`).toBe(0)
    await page.emulateMedia({ media: 'screen' })
  }
})

test('each page loads at most 200 kB up front and preloads only fonts it uses', async ({ page }) => {
  chromiumOnly()
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const path of layoutPages) {
    const bodies: Promise<{ url: string, type: string, size: number }>[] = []
    const onResponse = (r: Response) => bodies.push(r.body().then(body => {
      const type = r.headers()['content-type'] ?? ''
      return { url: r.url(), type, size: /text|javascript|json|svg|css/.test(type) ? gzipSync(body).length : body.length }
    }, () => ({ url: r.url(), type: '', size: 0 })))
    page.on('response', onResponse)
    await page.goto(path, { waitUntil: 'networkidle' })
    page.off('response', onResponse)
    const responses = await Promise.all(bodies)
    const lazy = await page.locator('img[loading="lazy"]').evaluateAll(imgs => imgs.map(i => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src))
    const upFront = responses.filter(r => !lazy.includes(r.url))
    expect(upFront.reduce((sum, r) => sum + r.size, 0), `${path}: first load`).toBeLessThanOrEqual(200_000)
    expect(upFront.filter(r => r.url.endsWith('.woff2')).length, `${path}: font files`).toBeLessThanOrEqual(3)
  }
  // Chromium reports a preload that no rule uses a few seconds after the load
  const warnings: string[] = []
  page.on('console', m => { if (/preload/i.test(m.text())) warnings.push(m.text()) })
  await page.goto('docs/theming.html', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3500)
  expect(warnings, 'unused preloads').toEqual([])
})

test('content reflows at 320px, at 200% text and with wider text spacing', async ({ browser }) => {
  chromiumOnly()
  test.setTimeout(240_000)
  const spacing = '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important } p { margin-block-end: 2em !important }'
  const cases: [string, number, string][] = [['320px', 320, ''], ['200% text', 1024, 'html { font-size: 200% !important }'], ['200% text', 1280, 'html { font-size: 200% !important }'], ['text spacing', 320, spacing]]
  const failures: string[] = []
  for (const [name, width, css] of cases) {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width, height: 800 } })
    await routeSite(context)
    const page = await context.newPage()
    for (const path of layoutPages) {
      await open(page, path)
      if (css) await page.addStyleTag({ content: css })
      const result = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        // a one-line command next to its copy button must wrap instead of scrolling or running under the button
        const scrolling = [...document.querySelectorAll('main pre')].filter(p => p.scrollWidth > p.clientWidth + 1 && !p.closest('.table-scroll')).map(p => (p.textContent ?? '').trim().slice(0, 30))
        const header = [...document.querySelectorAll('header a, header select, header summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('details:not([open]) > :not(summary)') })
          .map(e => e.getBoundingClientRect())
        let overlap = 0
        for (let i = 0; i < header.length; i++) for (let j = i + 1; j < header.length; j++) {
          const a = header[i], b = header[j]
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++
        }
        return { scroll: document.documentElement.scrollWidth - vw, scrolling, overlap }
      })
      const where = `${path} ${name} at ${width}px`
      if (result.scroll > 0) failures.push(`${where}: page scrolls ${result.scroll}px sideways`)
      for (const p of result.scrolling) failures.push(`${where}: code scrolls instead of wrapping: ${p}`)
      if (result.overlap) failures.push(`${where}: ${result.overlap} overlapping header controls`)
    }
    await context.close()
  }
  expect(failures).toEqual([])
})

test('reduced motion stops every transition and forced colours keep the current page marked', async ({ browser }) => {
  chromiumOnly()
  const motion = await browser.newContext({ baseURL: test.info().project.use.baseURL, reducedMotion: 'reduce' })
  await routeSite(motion)
  const page = await motion.newPage()
  const moving: string[] = []
  for (const path of layoutPages) {
    await page.goto(path)
    moving.push(...(await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => {
      const s = getComputedStyle(e)
      return s.transitionDuration.split(',').some(d => parseFloat(d) > 0) || (s.animationName !== 'none' && parseFloat(s.animationDuration) > 0)
    }).map(e => `${e.localName}.${String(e.className).split(' ')[0]}`))).map(e => `${path}: ${e}`))
  }
  expect([...new Set(moving)]).toEqual([])
  await motion.close()

  const forced = await browser.newContext({ baseURL: test.info().project.use.baseURL, forcedColors: 'active' })
  await routeSite(forced)
  const fp = await forced.newPage()
  for (const path of ['playground.html', 'docs/theming.html']) {
    await fp.goto(path)
    const unmarked = await fp.evaluate(() => {
      const canvas = getComputedStyle(document.body).backgroundColor
      return [...document.querySelectorAll('header nav [aria-current], .layout > nav [aria-current]')].filter(a => {
        if (!(a as HTMLElement).offsetParent) return false
        const s = getComputedStyle(a)
        const sides = [['Top', s.borderTopWidth, s.borderTopColor], ['Right', s.borderRightWidth, s.borderRightColor], ['Bottom', s.borderBottomWidth, s.borderBottomColor], ['Left', s.borderLeftWidth, s.borderLeftColor]]
        return !sides.some(([, w, c]) => parseFloat(w) > 0 && c !== canvas) && s.textDecorationLine === 'none' && s.outlineStyle === 'none'
      }).map(a => (a.textContent ?? '').trim())
    })
    expect(unmarked, `${path}: current page visible in forced colours`).toEqual([])
  }
  await forced.close()
})
