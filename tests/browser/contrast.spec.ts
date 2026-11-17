import { test, expect, gotoStates, project } from './fixtures.ts'

// WCAG 1.4.3 (4.5:1 text) and 1.4.11 (3:1 borders, arrow, focus); "page" is the page background of the fixture
const pairs: [string, string, number][] = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'hover', 4.5], ['text', 'selected', 4.5], ['text', 'selected-strong', 4.5],
  ['muted', 'bg', 4.5], ['muted', 'surface', 4.5], ['muted', 'selected', 4.5], ['muted', 'hover', 4.5],
  ['border', 'bg', 3], ['border', 'page', 3], ['arrow', 'bg', 3], ['accent', 'bg', 3], ['accent', 'page', 3],
  ['accent', 'surface', 3], ['accent', 'hover', 3], ['accent', 'selected', 3], ['accent', 'selected-strong', 3],
  ['invalid', 'bg', 3], ['invalid', 'page', 3],
]
const tokens = [...new Set(pairs.flatMap(([fg, bg]) => [fg, bg]))].filter(t => t !== 'page')
const scopes = ['#fall-default', '#fall-look-moss', '#fall-look-steel', '#fall-look-coral']

const luminance = (c: number[]) => c.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// resolves light-dark() and color-mix() to sRGB by painting one canvas pixel
function toRgb(color: string) {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
}

test.beforeEach(async ({ page }) => {
  test.skip(project() !== 'chromium', 'colours do not depend on the engine')
  await page.addInitScript(`window.toRgb = ${toRgb}`)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`token pairs meet WCAG contrast, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await gotoStates(page)
    const measured = await page.evaluate(({ scopes, tokens }) => scopes.map(scope => {
      const rgb = (window as unknown as { toRgb: typeof toRgb }).toRgb
      const probe = document.querySelector(scope)!.appendChild(document.createElement('div'))
      probe.className = 'sqs'
      const colors: Record<string, number[]> = { page: rgb(getComputedStyle(document.body).backgroundColor) }
      for (const t of tokens) {
        probe.style.color = `var(--_sqs-${t})`
        colors[t] = rgb(getComputedStyle(probe).color)
      }
      probe.remove()
      return colors
    }), { scopes, tokens })
    const failures = measured.flatMap((colors, i) => pairs
      .filter(([fg, bg, min]) => ratio(colors[fg], colors[bg]) < min)
      .map(([fg, bg, min]) => `${scopes[i]}: ${fg} on ${bg} ${ratio(colors[fg], colors[bg]).toFixed(2)} < ${min}`))
    expect(failures).toEqual([])
  })
}

test('placeholder option, selected and keyboard focused, keeps 4.5:1', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    await gotoStates(page)
    await page.locator('#s-placeholder').focus()
    await page.keyboard.press('Enter')
    const option = page.locator('#s-placeholder option:focus-visible')
    await expect(option).toHaveText('Choose a species …')
    const [fg, bg] = await option.evaluate(el => {
      const rgb = (window as unknown as { toRgb: typeof toRgb }).toRgb
      return [rgb(getComputedStyle(el).color), rgb(getComputedStyle(el).backgroundColor)]
    })
    expect(ratio(fg, bg), colorScheme).toBeGreaterThanOrEqual(4.5)
  }
})
