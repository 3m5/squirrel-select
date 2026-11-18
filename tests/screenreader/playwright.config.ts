import { devices } from '@playwright/test'
import { withGuidepup } from '@guidepup/playwright'

// runs only on the Windows and macOS runners of the screen reader workflow, one project per runner
export default withGuidepup({
  testDir: '.',
  outputDir: '../../test-results/screenreader',
  timeout: 5 * 60 * 1000,
  retries: 0,
  reportSlowTests: null,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../screenreader-report/html' }],
    ['json', { outputFile: '../../screenreader-report/results.json' }],
  ],
  use: { baseURL: 'http://sqs.test/squirrel-select/', trace: 'retain-on-failure' },
  projects: [
    { name: 'nvda-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'voiceover-webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
