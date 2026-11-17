import { test, expect, gotoStates, project } from './fixtures.ts'

const appearance = (el: Element) => getComputedStyle(el).appearance

test('each engine takes the expected rendering path', async ({ page }) => {
  const expected: Record<string, string> = {
    'chromium': 'base-select', 'webkit': 'base-select', 'firefox': 'none', 'chromium-touch': 'none', 'webkit-touch': 'none',
  }
  await gotoStates(page)
  expect(await page.locator('#s-default').evaluate(appearance)).toBe(expected[project()])
})

test('forced colors fall back to the native select', async ({ page }) => {
  test.skip(!['chromium', 'firefox'].includes(project()), 'forced-colors emulation paints system colors only here')
  await page.emulateMedia({ forcedColors: 'active' })
  await gotoStates(page)
  expect(await page.locator('#s-default').evaluate(appearance)).toBe('auto')
  expect(await page.locator('#s-invalid').evaluate(el => getComputedStyle(el).borderTopStyle)).toBe('dashed')
})

test('reduced motion turns off the border transition', async ({ page }) => {
  const select = page.locator('#s-default')
  await gotoStates(page)
  expect(await select.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0.12s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await select.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s')
})
