import { test as base, expect, type Locator, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// pages come from site/, the stylesheet from the built dist/, so build errors show up too; no server process needed
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('http://sqs.test/**', route => {
      const { pathname } = new URL(route.request().url())
      const file = join(process.cwd(), pathname.startsWith('/dist/') ? '' : 'site', pathname)
      return existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404 })
    })
    await use(context)
  },
})

export { expect }

export const project = () => test.info().project.name
export const isBaseSelect = () => ['chromium', 'webkit'].includes(project())

export async function gotoStates(page: Page) {
  await page.goto('/examples/states.html')
  await page.evaluate(() => document.fonts.ready)
}

export async function openPicker(page: Page, select: Locator) {
  await select.click()
  await page.mouse.move(0, 0)
  await expect.poll(() => select.evaluate(el => el.matches(':open'))).toBe(true)
}

export async function focusByTab(page: Page, select: Locator) {
  await page.getByRole('link').first().focus()
  for (let i = 0; i < 30 && !(await select.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(select).toBeFocused()
}
