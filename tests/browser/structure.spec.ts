import { readdirSync } from 'node:fs'
import { test, expect, gotoStates, project } from './fixtures.ts'

// what stylelint cannot see, checked on the CSSOM of the built file
test('built stylesheet keeps the structure rules', async ({ page }) => {
  test.skip(project() !== 'chromium', 'one engine parses every rule')
  await gotoStates(page)
  const problems = await page.evaluate(() => {
    const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))
    if (!sheet?.cssRules.length) return ['stylesheet not loaded']
    const out: string[] = []
    // split a selector list at top-level commas only, :not(:where(a, b)) nests them
    const selectors = (text: string) => {
      const out = ['']
      let depth = 0
      for (const ch of text) {
        depth += ch === '(' ? 1 : ch === ')' ? -1 : 0
        if (ch === ',' && depth === 0) out.push('')
        else out[out.length - 1] += ch
      }
      return out.map(s => s.trim())
    }
    const walk = (rules: CSSRuleList, ctx: string[]) => {
      for (const r of rules) {
        if (r instanceof CSSLayerBlockRule) walk(r.cssRules, [...ctx, `layer ${r.name}`])
        else if (r instanceof CSSSupportsRule || r instanceof CSSMediaRule) walk(r.cssRules, [...ctx, r.conditionText])
        else if (r instanceof CSSStyleRule) {
          const where = ctx.join(' > ')
          if (ctx[0] !== 'layer squirrel') out.push(`1. outside @layer squirrel: ${r.selectorText}`)
          for (const s of selectors(r.selectorText)) if (!/\.sqs(?!\w)/.test(s)) out.push(`2. selector without .sqs: ${s}`)
          const baseSelect = ctx.some(c => /appearance:\s*base-select/.test(c))
          if (!baseSelect && !ctx.some(c => c.includes('light-dark('))) out.push(`3. not behind the light-dark() gate: ${r.selectorText} in ${where}`)
          if (!baseSelect && [...r.style].some(p => p.startsWith('text-box'))) out.push(`4. text-box outside base-select: ${r.selectorText}`)
          if (r.style.getPropertyValue('forced-color-adjust') === 'none') out.push(`5. forced-color-adjust: none: ${r.selectorText}`)
        } else out.push(`unexpected rule: ${r.cssText.slice(0, 60)}`)
      }
    }
    walk(sheet.cssRules, [])
    return out
  })
  expect(problems).toEqual([])
})

// native pickers and touch lists show only the text, so a label attribute is not enough
test('every option on every built page has visible text', async ({ page }) => {
  test.skip(project() !== 'chromium', 'engine independent')
  const pages = readdirSync('_site', { recursive: true, encoding: 'utf8' }).filter(f => f.endsWith('.html'))
  expect(pages).toContain('examples/states.html')
  const empty: string[] = []
  for (const path of pages) {
    await page.goto(path)
    const found = await page.locator('option').evaluateAll(os => os.filter(o => !o.textContent?.trim()).map(o => o.outerHTML))
    empty.push(...found.map(html => `${path}: ${html}`))
  }
  expect(empty).toEqual([])
})
