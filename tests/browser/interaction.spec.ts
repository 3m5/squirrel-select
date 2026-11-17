import { test, expect, gotoStates, openPicker, focusByTab, isBaseSelect } from './fixtures.ts'

const isOpen = (el: Element) => el.matches(':open')

test('keyboard opens, chooses and closes; focus returns to the field', async ({ page }) => {
  test.skip(!isBaseSelect(), 'native list, covered by the browser')
  await gotoStates(page)
  const select = page.locator('#s-selected')
  await focusByTab(page, select)
  await page.keyboard.press('Enter')
  expect(await select.evaluate(isOpen)).toBe(true)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  expect(await select.evaluate(isOpen)).toBe(false)
  await expect(select).toHaveValue('Edible dormouse')
  await page.keyboard.press(' ')
  expect(await select.evaluate(isOpen)).toBe(true)
  await page.keyboard.press('Escape')
  expect(await select.evaluate(isOpen)).toBe(false)
  await expect(select).toBeFocused()
  await expect(select).toHaveValue('Edible dormouse')
})

test('form value, reset and :user-invalid after a submit attempt', async ({ page }) => {
  await gotoStates(page)
  const select = page.locator('#s-placeholder')
  const value = () => select.evaluate(el => new FormData((el as HTMLSelectElement).form!).get('species'))
  expect(await value()).toBe('')
  await select.selectOption('Grey squirrel')
  expect(await value()).toBe('Grey squirrel')
  await select.evaluate(el => (el as HTMLSelectElement).form!.reset())
  expect(await value()).toBe('')
  await select.evaluate(el => (el as HTMLSelectElement).form!.requestSubmit())
  expect(await select.evaluate(el => el.matches(':user-invalid'))).toBe(true)
  const invalid = await page.locator('#s-invalid').evaluate(el => getComputedStyle(el).borderTopColor)
  await expect.poll(() => select.evaluate(el => getComputedStyle(el).borderTopColor)).toBe(invalid)
})

test('disabled field, option and fieldset', async ({ page }) => {
  await gotoStates(page)
  for (const id of ['#s-disabled', '#s-fieldset']) {
    const select = page.locator(id)
    await expect(select).toBeDisabled()
    expect(await select.evaluate(el => getComputedStyle(el).cursor)).toBe('not-allowed')
  }
  const muted = await page.locator('#s-placeholder').evaluate(el => getComputedStyle(el).color)
  expect(await page.locator('#s-optgroup option[disabled]').evaluate(el => getComputedStyle(el).color)).toBe(muted)
  if (!isBaseSelect()) return
  await page.locator('#s-disabled').click({ force: true })
  expect(await page.locator('#s-disabled').evaluate(isOpen)).toBe(false)
})

test('host CSS wins without !important, tokens arrive from an ancestor', async ({ page }) => {
  await gotoStates(page)
  const border = (id: string) => page.locator(id).evaluate(el => getComputedStyle(el).borderTopColor)
  expect(await border('#s-ancestor')).toBe('rgb(77, 89, 101)')
  await page.addStyleTag({ content: '.sqs { border-color: rgb(255, 0, 0) }' })
  await expect.poll(() => border('#s-default')).toBe('rgb(255, 0, 0)')
})

test('open list stays in the viewport, flips up at the bottom, fits 320px', async ({ page }) => {
  test.skip(!isBaseSelect(), 'native list')
  for (const width of [1024, 320]) {
    await page.setViewportSize({ width, height: 600 })
    await gotoStates(page)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const select = page.locator('#s-bottom')
    await openPicker(page, select)
    const field = (await select.boundingBox())!
    const option = page.locator('#s-bottom option:checked')
    const box = (await option.boundingBox())!
    expect(box.y + box.height, `${width}px: list opens above the field`).toBeLessThanOrEqual(field.y)
    expect(box.y, `${width}px: selected option is on screen`).toBeGreaterThanOrEqual(0)
    const hit = await option.evaluate(el => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el
    })
    expect(hit, `${width}px: selected option is visible`).toBe(true)
    const sides = await page.locator('#s-bottom option').evaluateAll(os => os.map(o => o.getBoundingClientRect()).map(r => [r.left, r.right]))
    for (const [left, right] of sides) expect(left >= 0 && right <= width, `${width}px: option spans ${left}–${right}`).toBe(true)
    await page.keyboard.press('Escape')
  }
})
