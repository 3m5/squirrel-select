import { defineConfig, devices } from '@playwright/test'

const desktop = { viewport: { width: 1024, height: 768 } }
const touch = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }

export default defineConfig({
  testDir: 'tests/browser',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://sqs.test/squirrel-select/' },
  expect: { toHaveScreenshot: { maxDiffPixels: 10, animations: 'disabled', caret: 'hide' } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...desktop } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop } },
    { name: 'chromium-touch', use: { browserName: 'chromium', ...touch } },
    { name: 'webkit-touch', use: { browserName: 'webkit', ...touch } },
  ],
})
