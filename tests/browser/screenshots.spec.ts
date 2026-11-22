import { test, expect, gotoStates, openPicker, focusByTab, project, isBaseSelect } from './fixtures.ts'

// a small fixed set of images; native lists (Firefox, touch, forced colors) cannot be captured open
const only = (...projects: string[]) => test.skip(!projects.includes(project()), `not in ${project()}`)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`closed, ${colorScheme}`, async ({ page }) => {
    only('chromium', 'webkit', 'firefox')
    await page.emulateMedia({ colorScheme })
    await gotoStates(page)
    await expect(page).toHaveScreenshot(`closed-${colorScheme}.png`, { fullPage: true })
  })
}

test('focus', async ({ page }) => {
  only('chromium', 'webkit', 'firefox')
  await gotoStates(page)
  await focusByTab(page, page.locator('#s-default'))
  await expect(page.locator('#fall-default')).toHaveScreenshot('focus.png')
})

const openShots: [string, string, 'light' | 'dark'][] = [
  ['open-light', '#s-optgroup', 'light'],
  ['open-dark', '#s-optgroup', 'dark'],
  ['open-rich', '#s-rich', 'light'],
  ['open-rtl', '#s-rtl', 'light'],
]
for (const [name, id, colorScheme] of openShots) {
  test(name, async ({ page }) => {
    test.skip(!isBaseSelect(), 'native list cannot be captured')
    await page.emulateMedia({ colorScheme })
    await gotoStates(page)
    const select = page.locator(id)
    await select.evaluate(el => el.closest('figure')!.scrollIntoView({ block: 'center' }))
    await openPicker(page, select)
    await expect(page).toHaveScreenshot(`${name}.png`)
  })
}

test('open at the bottom edge, 320px', async ({ page }) => {
  test.skip(!isBaseSelect(), 'native list cannot be captured')
  await page.setViewportSize({ width: 320, height: 600 })
  await gotoStates(page)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await openPicker(page, page.locator('#s-bottom'))
  await expect(page).toHaveScreenshot('open-bottom-320.png')
})

test('forced colors, closed', async ({ page }) => {
  only('chromium', 'firefox')
  await page.emulateMedia({ forcedColors: 'active' })
  await gotoStates(page)
  // a tall window instead of fullPage, which loses the forced-colors emulation in Chromium
  await page.setViewportSize({ width: 1024, height: await page.evaluate(() => document.documentElement.scrollHeight) })
  await expect(page).toHaveScreenshot('forced-colors.png')
})

test('touch, closed', async ({ page }) => {
  only('chromium-touch', 'webkit-touch')
  await gotoStates(page)
  await expect(page).toHaveScreenshot('touch.png', { fullPage: true })
})

// the picture in the hero of the start page is this snapshot, copied into the site by the build
test.describe('hero picture', () => {
  // tall enough that both frames are in view and each list opens downwards
  test.use({ deviceScaleFactor: 2, viewport: { width: 1024, height: 1000 } })
  for (const variant of ['dark', 'light'] as const) {
    test(`hero, ${variant}`, async ({ page }) => {
      only('chromium')
      await page.goto('examples/hero.html')
      await page.evaluate(() => document.fonts.ready)
      const frame = page.locator(`#hero-${variant}`)
      await openPicker(page, frame.locator('select'))
      await expect(page).toHaveScreenshot(`hero-${variant}.png`, { clip: (await frame.boundingBox())!, omitBackground: true, scale: 'device' })
    })
  }
})
