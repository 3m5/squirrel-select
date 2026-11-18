import { voiceOverTest as test } from '@guidepup/playwright'
import { expect, type Page } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { release } from 'node:os'
import { join } from 'node:path'

type Variant = { cls: string, pickerNative?: boolean }

const variants = {
  with: { cls: ' class="sqs"' },
  without: { cls: '' },
  // the class without base-select on the open list, which is where WebKit adds the group
  pickerNative: { cls: ' class="sqs"', pickerNative: true },
} satisfies Record<string, Variant>
type Name = keyof typeof variants

test.skip(({ browserName }) => browserName !== 'webkit', 'VoiceOver only')

// the same markup each time, so any difference in what is spoken comes from the stylesheet;
// the link comes first so that the screen reader does not start on a select
const markup = ({ cls }: Variant) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Screen reader check</title>
<link rel="stylesheet" href="../dist/squirrel-select.css">
</head>
<body>
<a href="#main">Start</a>
<main id="main">
<h1>Screen reader check</h1>
<p><label for="species">Species</label> <select${cls} id="species"><option>Red squirrel</option><option>Grey squirrel</option><option>Hazel dormouse</option></select></p>
<p><label for="sold">Sold out</label> <select${cls} id="sold" disabled><option>Caucasian squirrel</option></select></p>
<p><label for="habitats">Habitats</label> <select${cls} id="habitats" multiple><option>Forest</option><option selected>Park</option><option>Garden</option></select></p>
<p><label for="diet">Diet</label> <select${cls} id="diet" size="4"><option>Nuts</option><option>Seeds</option><option>Fungi</option><option>Buds</option></select></p>
<p><label for="checked">Checked species</label> <select${cls} id="checked" aria-invalid="true" aria-describedby="checked-error"><option value="">Choose a species …</option><option>Red squirrel</option></select></p>
<p id="checked-error">Please choose a species.</p>
</main>
</body>
</html>
`

async function serve(page: Page) {
  await page.context().route('http://sqs.test/**', route => {
    const { pathname } = new URL(route.request().url())
    const check = pathname.match(/^\/squirrel-select\/check\/(\w+)\.html$/)
    if (check && check[1] in variants) return route.fulfill({ contentType: 'text/html', body: markup(variants[check[1] as Name]) })
    const file = join(process.cwd(), '_site', pathname.replace(/^\/squirrel-select\//, ''))
    return pathname.startsWith('/squirrel-select/') && existsSync(file) && statSync(file).isFile() ? route.fulfill({ path: file }) : route.fulfill({ status: 404 })
  })
}

// takes ::picker(select) out of the base-select rule of the built stylesheet, the field keeps base-select
const nativePicker = (page: Page) => page.evaluate(() => {
  const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))
  if (!sheet) throw new Error('stylesheet not loaded')
  const top = (text: string) => {
    const out = ['']
    let depth = 0
    for (const ch of text) {
      depth += ch === '(' ? 1 : ch === ')' ? -1 : 0
      if (ch === ',' && depth === 0) out.push('')
      else out[out.length - 1] += ch
    }
    return out.map(s => s.trim())
  }
  const changed: string[] = []
  const walk = (list: CSSRuleList) => {
    for (const r of [...list]) {
      if (r instanceof CSSStyleRule) {
        if (r.selectorText.includes('::picker(select)') && r.style.appearance === 'base-select') {
          r.selectorText = top(r.selectorText).filter(s => !s.includes('::picker(')).join(', ')
          changed.push(r.selectorText)
        }
      } else if (r instanceof CSSGroupingRule) walk(r.cssRules)
    }
  }
  walk(sheet.cssRules)
  return changed
})

async function open(page: Page, name: Name) {
  await page.goto(`check/${name}.html`, { waitUntil: 'load' })
  await page.locator('h1').waitFor()
  if ((variants[name] as Variant).pickerNative) expect(await nativePicker(page), 'the picker rule was changed').toHaveLength(1)
  return page.locator('#species').evaluate(el => ({ field: getComputedStyle(el).appearance, picker: getComputedStyle(el, '::picker(select)').appearance }))
}

async function note(page: Page, name: string, data: unknown) {
  const info = test.info()
  if (!info.annotations.some(a => a.type === 'environment')) {
    info.annotations.push({ type: 'environment', description: `${process.platform} ${release()}, ${info.project.name}, browser ${page.context().browser()?.version()}` })
  }
  await info.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' })
}

// the rotor's form controls list and VO-Command-J must reach every enabled select
for (const name of ['with', 'without', 'pickerNative'] as const) {
  test(`form controls in rotor and quick navigation: ${name}`, async ({ page, voiceOver }) => {
    await serve(page)
    const appearance = await open(page, name)
    await voiceOver.navigateToWebContent()
    await page.locator('a').focus()
    const quick: string[] = []
    for (let i = 0; i < 6; i++) {
      await voiceOver.perform(voiceOver.keyboardCommands.findNextControl)
      quick.push(await voiceOver.lastSpokenPhrase())
    }
    await voiceOver.perform(voiceOver.keyboardCommands.openWebItemRotor)
    const rotor = [await voiceOver.lastSpokenPhrase()]
    for (let i = 0; i < 12 && !/form control/i.test(rotor.at(-1)!); i++) {
      await voiceOver.press('ArrowRight')
      rotor.push(await voiceOver.lastSpokenPhrase())
    }
    const menu = /form control/i.test(rotor.at(-1)!)
    for (let i = 0; menu && i < 6; i++) {
      await voiceOver.press('ArrowDown')
      rotor.push(await voiceOver.lastSpokenPhrase())
    }
    await voiceOver.press('Escape')
    await note(page, 'controls', { variant: name, appearance, quick, rotor })
    expect.soft(quick.join(' | '), 'quick navigation reaches the selects').toMatch(/Species[\s\S]*Habitats[\s\S]*Diet[\s\S]*Checked species/)
    expect.soft(menu, 'the rotor has a form controls list').toBe(true)
    for (const label of ['Species', 'Habitats', 'Diet', 'Checked species']) {
      expect.soft(rotor.join(' | '), `rotor lists ${label}`).toContain(label)
    }
  })
}

// keys go to the front window through the system, so the native menu of the bare select gets them too
for (const name of ['with', 'without'] as const) {
  test(`choosing with the keyboard announces the new value: ${name}`, async ({ page, voiceOver }) => {
    await serve(page)
    const appearance = await open(page, name)
    await voiceOver.navigateToWebContent()
    const select = page.locator('#species')
    // every phrase spoken in the two seconds after the action, not only the last one
    const step = async (action: () => Promise<unknown>) => {
      await voiceOver.clearSpokenPhraseLog()
      await action()
      await page.waitForTimeout(2000)
      return (await voiceOver.spokenPhraseLog()).join(' | ')
    }
    // macOS opens a select with the arrow keys
    const spoken = {
      focus: await step(() => select.focus()),
      open: await step(() => voiceOver.press('ArrowDown')),
      next: await step(() => voiceOver.press('ArrowDown')),
      choose: await step(() => voiceOver.press('Enter')),
      after: await step(() => Promise.resolve()),
    }
    const value = await select.inputValue()
    await note(page, 'choose', { variant: name, appearance, spoken, value })
    expect.soft(value, 'the second option is chosen').toBe('Grey squirrel')
    expect.soft(spoken.open, 'opening is announced').toMatch(/expanded|menu|Red squirrel/i)
    expect.soft(spoken.next, 'the active option is announced').toContain('Grey squirrel')
    expect.soft(spoken.choose, 'the new value is announced').toContain('Grey squirrel')
  })
}
