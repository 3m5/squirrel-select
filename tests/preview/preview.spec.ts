import { test, expect, gotoStates, openPicker, project } from '../browser/fixtures.ts'

// if the first test fails, the images are skipped instead of silently showing the fallback
test.describe.configure({ mode: 'serial' })

test('base-select is on only where the prefs are set', async ({ page }) => {
  const withPrefs = project() === 'firefox-preview'
  await gotoStates(page)
  expect(await page.evaluate(() => CSS.supports('appearance', 'base-select')), 'CSS.supports base-select').toBe(withPrefs)
  expect(await page.locator('#s-default').evaluate(el => getComputedStyle(el).appearance)).toBe(withPrefs ? 'base-select' : 'none')
})

test('closed', async ({ page }) => {
  test.skip(project() !== 'firefox-preview', 'images only with the prefs')
  await gotoStates(page)
  await expect(page).toHaveScreenshot('closed.png', { fullPage: true })
})

test('open', async ({ page }) => {
  test.skip(project() !== 'firefox-preview', 'images only with the prefs')
  await gotoStates(page)
  const select = page.locator('#s-optgroup')
  await select.evaluate(el => el.closest('figure')!.scrollIntoView({ block: 'center' }))
  await openPicker(page, select)
  await expect(page).toHaveScreenshot('open.png')
})
