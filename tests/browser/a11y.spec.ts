import AxeBuilder from '@axe-core/playwright'
import { test, expect, gotoStates, openPicker, focusByTab, project, isBaseSelect } from './fixtures.ts'

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`axe finds no violations, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await gotoStates(page)
    const axe = new AxeBuilder({ page }).withTags(tags)
    // Firefox keeps <button><selectedcontent> in the DOM but neither renders nor fills it without the prefs
    if (project() === 'firefox') axe.exclude('.sqs > button')
    const { violations } = await axe.analyze()
    expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)).toEqual([])
  })
}

test('every option has visible text (golden rule)', async ({ page }) => {
  test.skip(project() !== 'chromium', 'engine independent')
  await gotoStates(page)
  const empty = await page.locator('option').evaluateAll(os => os.filter(o => !o.textContent?.trim()).map(o => o.outerHTML))
  expect(empty).toEqual([])
})

test('focus ring on the field is an outline of at least 2px', async ({ page }) => {
  await gotoStates(page)
  const select = page.locator('#s-default')
  await focusByTab(page, select)
  const { style, width } = await select.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }))
  expect(style).not.toBe('none')
  expect(width).toBeGreaterThanOrEqual(2)
})

test('keyboard focus on an option is an outline of at least 2px', async ({ page }) => {
  test.skip(!isBaseSelect(), 'the list is native here')
  await gotoStates(page)
  const select = page.locator('#s-optgroup')
  await focusByTab(page, select)
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  const option = page.locator('#s-optgroup option:focus-visible')
  await expect(option).toHaveCount(1)
  const { style, width } = await option.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }))
  expect(style).not.toBe('none')
  expect(width).toBeGreaterThanOrEqual(2)
})

test('fields are at least 24px high, 44px on touch as a report', async ({ page }) => {
  await gotoStates(page)
  const heights = await page.locator('select.sqs').evaluateAll(els => els.map(el => el.getBoundingClientRect().height))
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(24)
  if (project().endsWith('-touch')) test.info().annotations.push({ type: 'touch target', description: `smallest field ${Math.min(...heights)}px (recommended 44px)` })
})

test('options in the open list are at least 24px high', async ({ page }) => {
  test.skip(!isBaseSelect(), 'the list is native here')
  await gotoStates(page)
  await openPicker(page, page.locator('#s-optgroup'))
  const heights = await page.locator('#s-optgroup option').evaluateAll(os => os.map(o => o.getBoundingClientRect().height))
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(24)
})

test('reflow at 320px: no horizontal scrolling, open list inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await gotoStates(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  if (!isBaseSelect()) return
  await openPicker(page, page.locator('#s-optgroup'))
  const boxes = await page.locator('#s-optgroup option').evaluateAll(os => os.map(o => o.getBoundingClientRect()).map(r => [r.left, r.right]))
  for (const [left, right] of boxes) expect(left >= 0 && right <= 320, `option spans ${left}–${right}`).toBe(true)
})

for (const [name, css, width] of [
  ['text at 200%', 'html { font-size: 200% !important }', 640],
  ['text spacing (1.4.12)', '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important }', 1024],
] as const) {
  test(`${name}: option text is not cut off`, async ({ page }) => {
    test.skip(!isBaseSelect(), 'the list is native here')
    await page.setViewportSize({ width, height: 768 })
    await gotoStates(page)
    await page.addStyleTag({ content: css })
    await openPicker(page, page.locator('#s-optgroup'))
    const clipped = await page.locator('#s-optgroup option').evaluateAll(os =>
      os.filter(o => o.scrollWidth > o.clientWidth + 1 || o.scrollHeight > o.clientHeight + 1).map(o => o.textContent))
    expect(clipped).toEqual([])
  })
}

test('accessibility tree is the same with base-select and with auto', async ({ page }) => {
  test.skip(project() !== 'chromium', 'needs the Chrome DevTools Protocol')
  await gotoStates(page)
  const cdp = await page.context().newCDPSession(page)
  const ids = ['#s-default', '#s-placeholder', '#s-selected', '#s-invalid', '#s-optgroup', '#s-rich', '#s-rich-plain']
  const snapshot = async () => {
    const { root } = await cdp.send('DOM.getDocument')
    return Promise.all(ids.map(async selector => {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      const { nodes: [node] } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })
      const expanded = node.properties?.find(p => p.name === 'expanded')?.value.value
      return { selector, role: node.role?.value, name: node.name?.value, value: node.value?.value, expanded }
    }))
  }
  const baseSelect = await snapshot()
  await page.addStyleTag({ content: '.sqs, .sqs::picker(select) { appearance: auto }' })
  expect(await snapshot()).toEqual(baseSelect)
})
