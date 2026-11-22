import { test, expect, gotoStates, openPicker, project, isBaseSelect } from './fixtures.ts'
import type { Page } from '@playwright/test'

const isTouch = () => project().endsWith('-touch')
const forcedColorsProjects = ['chromium', 'firefox']

// an empty field, so every pixel inside the border that differs from the field belongs to the arrow
const field = (id: string, style = '', cls = '', text = '') =>
  `<select class="sqs${cls ? ` ${cls}` : ''}" id="${id}" style="${style}" aria-label="${id}"><option>${text}</option><option>Grey squirrel</option></select>`
const list = (id: string, style = '') =>
  `<select class="sqs" id="${id}" style="${style}" aria-label="${id}" multiple><option selected>Red squirrel</option><option>Grey squirrel</option><option>Hazel dormouse</option></select>`

async function open(page: Page, html: string) {
  await gotoStates(page)
  await page.locator('#fall-default').evaluate((figure, html) => figure.parentElement!.insertAdjacentHTML('beforeend', `
    <style>#t-options .sqs { display: block; inline-size: 16rem; margin-block-end: .5rem }</style>
    <figure class="fall wide" id="t-options">${html}</figure>`), html)
}

type Shot = { width: number, scale: number, grid: number[][][] }

// the middle half of the field in device pixels, which leaves out the rounded corners
async function shoot(page: Page, id: string): Promise<Shot> {
  const clip = await page.locator(`#${id}`).evaluate(el => {
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  const png = (await page.screenshot({ clip })).toString('base64')
  return page.evaluate(async ({ png, width }) => {
    const img = new Image()
    img.src = `data:image/png;base64,${png}`
    await img.decode()
    const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0)
    const top = Math.floor(img.height / 4), bottom = Math.ceil(img.height * 3 / 4)
    const { data } = ctx.getImageData(0, top, img.width, bottom - top)
    const grid = [...Array(bottom - top)].map((_, y) => [...Array(img.width)].map((_, x) => {
      const i = (y * img.width + x) * 4
      return [data[i], data[i + 1], data[i + 2]]
    }))
    return { width: img.width, scale: img.width / width, grid }
  }, { png, width: clip.width })
}

const diff = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])))

// the most common colour is the field; ink is everything clearly different from it, inside the side borders;
// the box comes back in CSS pixels, its right edge exclusive
function ink(shot: Shot, from = 4, to = shot.width / shot.scale - 4) {
  const counts = new Map<string, number>()
  for (const row of shot.grid) for (const p of row) counts.set(p.join(), (counts.get(p.join()) ?? 0) + 1)
  const bg = [...counts].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
  let box: { left: number, right: number, top: number, bottom: number } | null = null
  let strongest = bg
  shot.grid.forEach((row, y) => row.forEach((p, x) => {
    if (x < from * shot.scale || x >= to * shot.scale || diff(p, bg) <= 40) return
    if (diff(p, bg) > diff(strongest, bg)) strongest = p
    box = box ? { left: Math.min(box.left, x), right: Math.max(box.right, x), top: Math.min(box.top, y), bottom: Math.max(box.bottom, y) } : { left: x, right: x, top: y, bottom: y }
  }))
  const b = box as { left: number, right: number, top: number, bottom: number } | null
  const css = (v: number) => v / shot.scale
  return {
    bg, strongest,
    box: b && { left: css(b.left), right: css(b.right + 1), width: css(b.right - b.left + 1), height: css(b.bottom - b.top + 1), pixels: b },
  }
}

// the largest colour difference between a pixel and its mirror image across the middle of the arrow
function asymmetry(shot: Shot) {
  const box = ink(shot).box?.pixels
  if (!box) return Infinity
  let worst = 0
  for (let y = box.top; y <= box.bottom; y++) {
    for (let x = box.left; x <= box.right; x++) worst = Math.max(worst, diff(shot.grid[y][x], shot.grid[y][box.left + box.right - x]))
  }
  return worst
}

const metrics = (page: Page, id: string) => page.locator(`#${id}`).evaluate(el => {
  const s = getComputedStyle(el)
  const [w, h] = s.backgroundSize.split(' ').map(parseFloat)
  return {
    arrow: { width: w, height: h },
    start: parseFloat(s.paddingInlineStart),
    end: parseFloat(s.paddingInlineEnd),
    left: parseFloat(s.paddingLeft),
    right: parseFloat(s.paddingRight),
    border: parseFloat(s.borderLeftWidth),
    image: s.backgroundImage,
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    font: parseFloat(s.fontSize),
  }
})

test('arrow size: the arrow and the space at its end grow with --sqs-arrow-size', async ({ page }) => {
  await open(page, field('t-default') + field('t-large', '--sqs-arrow-size: 1em') + field('t-small', '--sqs-arrow-size: .5em'))
  const sizes: Record<string, number> = { 't-default': 0.625, 't-large': 1, 't-small': 0.5 }
  const measured: Record<string, Awaited<ReturnType<typeof metrics>>> = {}
  for (const [id, em] of Object.entries(sizes)) {
    const m = measured[id] = await metrics(page, id)
    // the box is twice as wide as high and whole pixels high
    expect(m.arrow.height, id).toBe(Math.round(em * m.font / 2))
    expect(m.arrow.width, id).toBe(2 * m.arrow.height)
    const { box } = ink(await shoot(page, id))
    expect(box, `${id} shows an arrow`).not.toBeNull()
    expect(Math.abs(box!.width - m.arrow.width), `${id} drawn width ${box!.width}`).toBeLessThanOrEqual(1)
    expect(Math.abs(box!.height - m.arrow.height), `${id} drawn height ${box!.height}`).toBeLessThanOrEqual(1)
    // the arrow keeps its distance from the end
    expect(Math.abs(m.width - box!.right - m.border - m.start), `${id} distance from the end`).toBeLessThanOrEqual(1)
  }
  const grow = (id: string) => measured[id].end - measured['t-default'].end
  expect(grow('t-large')).toBe(measured['t-large'].arrow.width - measured['t-default'].arrow.width)
  expect(grow('t-small')).toBe(measured['t-small'].arrow.width - measured['t-default'].arrow.width)
  expect(grow('t-large')).toBeGreaterThan(0)
  expect(measured['t-large'].start).toBe(measured['t-default'].start)
})

// resolves a colour token in the context of the element
const tokenColor = (page: Page, id: string, color: string) => page.locator(`#${id}`).evaluate((el, color) => {
  const probe = el.parentElement!.appendChild(document.createElement('div'))
  probe.className = 'sqs'
  probe.style.color = color
  const value = getComputedStyle(probe).color.match(/\d+/g)!.slice(0, 3).map(Number)
  probe.remove()
  return value
}, color)

// a filled triangle pointing down, drawn in the arrow colour
const triangle = '--sqs-arrow-image: conic-gradient(from -45deg at 50% 100%, var(--_sqs-arrow) 90deg, #0000 0)'

test('own arrow image: a gradient follows --sqs-arrow, none hides the arrow, initial falls back', async ({ page }) => {
  await open(page, field('t-default') + field('t-triangle', triangle) + field('t-green', `${triangle}; --sqs-arrow: rgb(0 128 0)`)
    + field('t-none', '--sqs-arrow-image: none') + field('t-initial', '--sqs-arrow-image: initial'))
  const shots: Record<string, Shot> = {}
  for (const id of ['t-default', 't-triangle', 't-green', 't-none', 't-initial']) shots[id] = await shoot(page, id)
  const box = (id: string) => ink(shots[id]).box!
  const m = await metrics(page, 't-triangle')

  // the own image fills the same box (Chromium smooths the thin corners away), and its top row is solid where the chevron is open
  const topMiddle = (id: string) => { const { pixels } = box(id); return shots[id].grid[pixels.top][Math.round((pixels.left + pixels.right) / 2)] }
  expect(Math.abs(box('t-triangle').width - m.arrow.width), `drawn width ${box('t-triangle').width}`).toBeLessThanOrEqual(2)
  expect(Math.abs(box('t-triangle').height - m.arrow.height), `drawn height ${box('t-triangle').height}`).toBeLessThanOrEqual(1)
  expect(diff(topMiddle('t-triangle'), ink(shots['t-triangle']).bg)).toBeGreaterThan(40)
  expect(diff(topMiddle('t-default'), ink(shots['t-default']).bg)).toBeLessThanOrEqual(40)

  expect(diff(ink(shots['t-triangle']).strongest, await tokenColor(page, 't-triangle', 'var(--_sqs-arrow)'))).toBeLessThanOrEqual(4)
  expect(diff(ink(shots['t-green']).strongest, [0, 128, 0])).toBeLessThanOrEqual(4)
  await page.emulateMedia({ colorScheme: 'dark' })
  const dark = await tokenColor(page, 't-triangle', 'var(--_sqs-arrow)')
  expect(diff(dark, await tokenColor(page, 't-default', 'var(--_sqs-muted)'))).toBe(0)
  expect(diff(ink(await shoot(page, 't-triangle')).strongest, dark)).toBeLessThanOrEqual(4)

  expect(ink(shots['t-none']).box).toBeNull()
  expect(shots['t-initial'].grid).toEqual(shots['t-default'].grid)
})

test('arrow at the start: left in LTR, right in RTL, the text moves in', async ({ page }) => {
  const text = 'Red squirrel'
  await open(page, field('t-end', '', '', text) + field('t-start', '', 'sqs-arrow-start', text) + field('t-start-empty', '', 'sqs-arrow-start')
    + `<div dir="rtl">${field('t-rtl-end', '', '', text) + field('t-rtl-start', '', 'sqs-arrow-start', text) + field('t-rtl-start-empty', '', 'sqs-arrow-start')}</div>`
    + list('t-list') + list('t-list-start').replace('class="sqs"', 'class="sqs sqs-arrow-start"'))
  const [end, start, rtlEnd, rtlStart] = await Promise.all(['t-end', 't-start', 't-rtl-end', 't-rtl-start'].map(id => metrics(page, id)))

  // the space for the arrow moves to the start, logical sides included
  expect([start.left, start.right]).toEqual([end.right, end.left])
  expect([rtlStart.right, rtlStart.left]).toEqual([rtlEnd.left, rtlEnd.right])
  expect([start.start, start.end, rtlStart.start, rtlStart.end]).toEqual([end.end, end.start, rtlEnd.end, rtlEnd.start])

  const ltr = ink(await shoot(page, 't-start-empty')).box!
  expect(Math.abs(ltr.left - start.border - start.right), `arrow ${ltr.left}px from the left`).toBeLessThanOrEqual(1)
  const rtl = ink(await shoot(page, 't-rtl-start-empty')).box!
  expect(Math.abs(rtlStart.width - rtl.right - rtlStart.border - rtlStart.left), `arrow ${rtlStart.width - rtl.right}px from the right`).toBeLessThanOrEqual(1)

  // the text starts after the arrow, as far in as the padding says; glyph side bearings cancel out
  const textLeft = async (id: string, after = 0) => ink(await shoot(page, id), after).box!.left
  const textRight = async (id: string, before: number) => ink(await shoot(page, id), 4, before).box!.right
  expect(Math.abs((await textLeft('t-start', ltr.right + 1)) - (await textLeft('t-end', 4)) - (start.left - end.left))).toBeLessThanOrEqual(1)
  expect(Math.abs((await textRight('t-rtl-end', rtlEnd.width - 4)) - (await textRight('t-rtl-start', rtl.left - 1)) - (rtlStart.right - rtlEnd.right))).toBeLessThanOrEqual(1)

  // lists have no arrow and keep their spacing
  const box = (id: string) => page.locator(`#${id}`).evaluate(el => { const s = getComputedStyle(el); return [s.paddingLeft, s.paddingRight, s.backgroundImage] })
  expect(await box('t-list-start')).toEqual(await box('t-list'))
})

test('arrow at the start in forced colors: no image, normal spacing', async ({ page }) => {
  test.skip(!forcedColorsProjects.includes(project()), 'forced-colors emulation paints system colors only here')
  // browsers drop gradients in forced colors by themselves, but not an image file
  const svg = '--sqs-arrow-image: url(data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%202%201%22%3E%3Cpath%20d=%22M0%200h2L1%201z%22/%3E%3C/svg%3E)'
  await open(page, field('t-end') + field('t-start', '', 'sqs-arrow-start') + `<div dir="rtl">${field('t-rtl-end') + field('t-rtl-start', '', 'sqs-arrow-start')}</div>`
    + field('t-svg', svg) + field('t-svg-start', svg, 'sqs-arrow-start'))
  expect((await metrics(page, 't-svg')).image).toMatch(/^url\(/)
  await page.emulateMedia({ forcedColors: 'active' })
  const [end, start, rtlEnd, rtlStart, ...svgs] = await Promise.all(['t-end', 't-start', 't-rtl-end', 't-rtl-start', 't-svg', 't-svg-start'].map(id => metrics(page, id)))
  for (const m of [end, start, rtlEnd, rtlStart, ...svgs]) expect(m.image).toBe('none')
  expect([start.left, start.right]).toEqual([end.left, end.right])
  expect([rtlStart.left, rtlStart.right]).toEqual([rtlEnd.left, rtlEnd.right])
  // nothing is drawn in the space at the start, the native arrow sits at the end
  expect(ink(await shoot(page, 't-start'), 4, start.left).box).toBeNull()
})

test('rounded arrow: both halves mirror each other at 14, 16 and 18px', async ({ page }) => {
  const fonts = [14, 16, 18]
  await open(page, fonts.map(px => field(`t-${px}`, `--sqs-font-size: ${px}px`)).join(''))
  const found: Record<number, { font: number, height: number, asymmetry: number }> = {}
  for (const px of fonts) {
    const m = await metrics(page, `t-${px}`)
    found[px] = { font: m.font, height: m.arrow.height, asymmetry: asymmetry(await shoot(page, `t-${px}`)) }
  }
  test.info().annotations.push({ type: 'arrow', description: JSON.stringify(found) })
  for (const px of fonts) expect(found[px].asymmetry, `${px}px mirror difference`).toBeLessThanOrEqual(8)
  for (const px of fonts) expect(found[px].height, `${px}px whole pixels`).toBe(Math.round(found[px].font * 0.625 / 2))
})

test('field height follows --sqs-height, never below 24px (44px on touch)', async ({ page }) => {
  await open(page, field('t-default', '', '', 'Red squirrel') + field('t-tall', '--sqs-height: 4em', '', 'Red squirrel')
    + field('t-low', '--sqs-height: 10px; --sqs-padding-block: 0; --sqs-font-size: 10px', '', 'Red squirrel'))
  const [standard, tall, low] = await Promise.all(['t-default', 't-tall', 't-low'].map(id => metrics(page, id)))
  const floor = isTouch() ? 44 : 24
  expect(standard.height).toBeCloseTo(Math.max(2.5 * standard.font, floor), 0)
  expect(tall.height).toBeCloseTo(Math.max(4 * tall.font, floor), 0)
  expect(low.height).toBeCloseTo(floor, 0)
})

const padding = (page: Page, id: string) => page.locator(`#${id} option`).evaluateAll(os => os.map(o => ({
  padding: parseFloat(getComputedStyle(o).paddingTop),
  height: o.getBoundingClientRect().height,
})))

test('option padding follows --sqs-option-padding-block in list boxes', async ({ page }) => {
  await open(page, list('t-list') + list('t-roomy', '--sqs-option-padding-block: 1em') + list('t-tight', '--sqs-option-padding-block: 0px'))
  const [standard, roomy, tight] = await Promise.all(['t-list', 't-roomy', 't-tight'].map(id => padding(page, id)))
  // touch keeps rows at least 44px high through the padding
  const touchFloor = (44 - 1.25 * 16) / 2
  expect(standard[1].padding).toBe(isTouch() ? touchFloor : 6)
  expect(roomy[1].padding).toBe(16)
  expect(tight[1].padding).toBe(isTouch() ? touchFloor : 0)
  test.info().annotations.push({ type: 'rows', description: JSON.stringify({ standard: standard[1].height, roomy: roomy[1].height, tight: tight[1].height }) })
  if (project().startsWith('webkit')) {
    test.info().annotations.push({ type: 'row height', description: 'WebKit sets the row height of list boxes itself' })
    return
  }
  expect(roomy[1].height - standard[1].height).toBeCloseTo(2 * (roomy[1].padding - standard[1].padding), 0)
})

test('option padding follows --sqs-option-padding-block in the open list', async ({ page }) => {
  test.skip(!isBaseSelect(), 'the open list is the browser’s own here')
  await open(page, field('t-default', '', '', 'Red squirrel') + field('t-roomy', '--sqs-option-padding-block: 1em', '', 'Red squirrel') + field('t-tight', '--sqs-option-padding-block: 0px', '', 'Red squirrel'))
  const rows: Record<string, { padding: number, height: number }> = {}
  for (const id of ['t-default', 't-roomy', 't-tight']) {
    await openPicker(page, page.locator(`#${id}`))
    rows[id] = (await padding(page, id))[1]
    await page.keyboard.press('Escape')
  }
  expect([rows['t-default'].padding, rows['t-roomy'].padding, rows['t-tight'].padding]).toEqual([6, 16, 0])
  expect(rows['t-roomy'].height - rows['t-default'].height).toBeCloseTo(20, 0)
  // the rows keep their minimum height of 2em
  expect(rows['t-tight'].height).toBeCloseTo(32, 0)
})

const radius = (page: Page, id: string) => page.locator(`#${id}`).evaluate(el => [
  getComputedStyle(el).borderTopLeftRadius,
  getComputedStyle((el as HTMLSelectElement).options[1]).borderTopLeftRadius,
  getComputedStyle(el, '::picker(select)').borderTopLeftRadius,
])

test('list radius follows --sqs-list-radius in list boxes and the open list, not the field', async ({ page }) => {
  await open(page, list('t-list') + list('t-square', '--sqs-list-radius: 0') + list('t-round', '--sqs-list-radius: 1rem')
    + field('t-field') + field('t-field-round', '--sqs-list-radius: 1rem'))
  expect((await radius(page, 't-list')).slice(0, 2)).toEqual(['6px', '2px'])
  expect((await radius(page, 't-square')).slice(0, 2)).toEqual(['0px', '0px'])
  expect((await radius(page, 't-round')).slice(0, 2)).toEqual(['16px', '12px'])
  expect((await radius(page, 't-field-round'))[0]).toBe((await radius(page, 't-field'))[0])
  if (!isBaseSelect()) return
  for (const [id, panel, option] of [['t-field', '6px', '2px'], ['t-field-round', '16px', '12px']]) {
    await openPicker(page, page.locator(`#${id}`))
    expect((await radius(page, id)).slice(1), id).toEqual([option, panel])
    await page.keyboard.press('Escape')
  }
})

test('arrow height: --sqs-arrow-height sets the box height, the width and the space stay with --sqs-arrow-size', async ({ page }) => {
  await open(page, field('t-size', '--sqs-arrow-size: 10px') + field('t-tall', '--sqs-arrow-size: 10px; --sqs-arrow-height: 25px'))
  const [size, tall] = await Promise.all(['t-size', 't-tall'].map(id => metrics(page, id)))
  expect(size.arrow).toEqual({ width: 10, height: 5 })
  expect(tall.arrow).toEqual({ width: 10, height: 25 })
  expect([tall.start, tall.end]).toEqual([size.start, size.end])
})

test('arrow inset: --sqs-arrow-inset moves the arrow from the edge, at the end, at the start and in RTL', async ({ page }) => {
  const inset = '--sqs-arrow-inset: 4px'
  await open(page, field('t-end') + field('t-inset', inset) + field('t-start-inset', inset, 'sqs-arrow-start')
    + `<div dir="rtl">${field('t-rtl-inset', inset) + field('t-rtl-start-inset', inset, 'sqs-arrow-start')}</div>`)
  const [end, ends, starts, rtl, rtlStart] = await Promise.all(['t-end', 't-inset', 't-start-inset', 't-rtl-inset', 't-rtl-start-inset'].map(id => metrics(page, id)))

  // the text keeps its padding, the space for the arrow shrinks by the difference
  expect(ends.start).toBe(end.start)
  expect(ends.end).toBe(end.end - (end.start - 4))
  expect([starts.start, starts.end]).toEqual([ends.end, ends.start])
  expect([rtl.start, rtl.end, rtlStart.start, rtlStart.end]).toEqual([ends.start, ends.end, starts.start, starts.end])

  const fromRight = async (id: string, m: typeof end) => m.width - ink(await shoot(page, id)).box!.right - m.border
  const fromLeft = async (id: string, m: typeof end) => ink(await shoot(page, id)).box!.left - m.border
  expect(Math.abs((await fromRight('t-inset', ends)) - 4)).toBeLessThanOrEqual(1)
  expect(Math.abs((await fromLeft('t-start-inset', starts)) - 4)).toBeLessThanOrEqual(1)
  expect(Math.abs((await fromLeft('t-rtl-inset', rtl)) - 4)).toBeLessThanOrEqual(1)
  expect(Math.abs((await fromRight('t-rtl-start-inset', rtlStart)) - 4)).toBeLessThanOrEqual(1)
})

test('border hover: --sqs-border-hover sets the border color on hover', async ({ page }) => {
  await open(page, field('t-hover', '--sqs-border-hover: rgb(0 128 0)'))
  const select = page.locator('#t-hover')
  const border = () => select.evaluate(el => getComputedStyle(el).borderTopColor)
  expect(await border()).not.toBe('rgb(0, 128, 0)')
  await select.hover()
  // the border color fades in over 120ms
  await expect.poll(border).toBe('rgb(0, 128, 0)')
})

test('open arrow: --sqs-arrow-image-open replaces the arrow while the list is open, not in forced colors', async ({ page }) => {
  test.skip(!isBaseSelect(), 'only the styled list has an open state for the field')
  const svg = 'url(data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%202%201%22%3E%3Cpath%20d=%22M0%201h2L1%200z%22/%3E%3C/svg%3E)'
  await open(page, field('t-default', '', '', 'Red squirrel') + field('t-open', `--sqs-arrow-image-open: ${svg}`, '', 'Red squirrel'))
  const image = (id: string) => page.locator(`#${id}`).evaluate(el => getComputedStyle(el).backgroundImage)
  const closed = await image('t-default')
  expect(await image('t-open')).toBe(closed)

  await openPicker(page, page.locator('#t-default'))
  expect(await image('t-default')).toBe(closed)
  await page.keyboard.press('Escape')

  await openPicker(page, page.locator('#t-open'))
  expect(await image('t-open')).toMatch(/^url\(/)
  await page.keyboard.press('Escape')
  await expect.poll(() => image('t-open')).toBe(closed)

  // the native list opens here too, next to the native arrow
  if (!forcedColorsProjects.includes(project())) return
  await page.emulateMedia({ forcedColors: 'active' })
  await openPicker(page, page.locator('#t-open'))
  expect(await image('t-open')).toBe('none')
})
