import { defineConfig, devices } from '@playwright/test'

const desktop = { viewport: { width: 1024, height: 768 } }
const touch = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }

// Firefox Nightly only exists in the weekly preview workflow, which sets FIREFOX_NIGHTLY to the downloaded binary
const nightlyPath = process.env.FIREFOX_NIGHTLY
const nightly = { ...devices['Desktop Firefox'], ...desktop, channel: 'moz-firefox-nightly' }
const customizableSelect = { 'dom.select.customizable_select.enabled': true, 'layout.css.appearance-base.enabled': true }
const preview = nightlyPath ? [
  { name: 'firefox-preview', testDir: 'tests/preview', use: { ...nightly, launchOptions: { executablePath: nightlyPath, firefoxUserPrefs: customizableSelect } } },
  { name: 'firefox-nightly', testDir: 'tests/preview', use: { ...nightly, launchOptions: { executablePath: nightlyPath } } },
] : []

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
    ...preview,
  ],
})
