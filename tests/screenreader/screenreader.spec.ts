import { screenReaderTest as test } from '@guidepup/playwright'
import { expect, type Page } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { release } from 'node:os'
import { join } from 'node:path'

type Key = { keyCode: number, modifiers?: string[] }
type Reader = {
  navigateToWebContent(): Promise<void>
  next(): Promise<void>
  lastSpokenPhrase(): Promise<string>
  spokenPhraseLog(): Promise<string[]>
  clearSpokenPhraseLog(): Promise<void>
  perform(command: Key): Promise<void>
  keyboardCommands: Record<string, Key>
}

// macOS virtual key codes
const keys = { escape: 53, right: 124, down: 125, enter: 36 }

// which part of the built stylesheet is taken out, applied on the CSSOM after the page has loaded
type Drop = 'stage1' | 'stage2' | 'pickerNative' | 'pickerBox' | 'options' | 'padding' | 'chevron' | 'ellipsis' | 'radius'
type Variant = { cls: string, head?: string, drop?: Drop }

const sqs = ' class="sqs"'
const variants = {
  with: { cls: sqs },
  without: { cls: '' },
  // the browser's own wording when field and list both use base-select
  basePicker: { cls: '', head: '<style>select, select::picker(select) { appearance: base-select }</style>' },
  noStage1: { cls: sqs, drop: 'stage1' },
  noStage2: { cls: sqs, drop: 'stage2' },
  pickerNative: { cls: sqs, drop: 'pickerNative' },
  noPickerBox: { cls: sqs, drop: 'pickerBox' },
  noOptions: { cls: sqs, drop: 'options' },
  noPadding: { cls: sqs, drop: 'padding' },
  noChevron: { cls: sqs, drop: 'chevron' },
  noEllipsis: { cls: sqs, drop: 'ellipsis' },
  noRadius: { cls: sqs, drop: 'radius' },
} satisfies Record<string, Variant>
type Name = keyof typeof variants
const names = Object.keys(variants) as Name[]

// the same markup each time, so any difference in what is spoken comes from the stylesheet;
// the link comes first so that the first Tab of the screen reader does not land on a select
const markup = ({ cls, head = '' }: Variant) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Screen reader check</title>
<link rel="stylesheet" href="../dist/squirrel-select.css">
${head}
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

// returns what was taken out, so the transcript shows that the variant really differs
const strip = (page: Page, drop: Drop) => page.evaluate((drop: Drop) => {
  const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))
  if (!sheet) throw new Error('stylesheet not loaded')
  const found: { rule: CSSStyleRule, picker: boolean }[] = []
  const walk = (list: CSSRuleList, picker: boolean) => {
    for (const r of [...list]) {
      if (r instanceof CSSStyleRule) found.push({ rule: r, picker })
      else if (r instanceof CSSGroupingRule) walk(r.cssRules, picker || (r instanceof CSSSupportsRule && r.conditionText.includes('base-select')))
    }
  }
  walk(sheet.cssRules, false)
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
  const remove = (rule: CSSStyleRule) => {
    const parent = rule.parentRule as CSSGroupingRule
    parent.deleteRule([...parent.cssRules].indexOf(rule))
    return rule.selectorText
  }
  const props = (re: RegExp) => found
    .filter(({ rule, picker }) => !picker && rule.style.getPropertyValue('cursor') === 'pointer')
    .flatMap(({ rule }) => [...rule.style].filter(p => re.test(p)).map(p => (rule.style.removeProperty(p), p)))
  const tokens = (rule: CSSStyleRule) => [...rule.style].some(p => p.startsWith('--'))
  const list = /\b(option|optgroup|hr|legend|selectedcontent|button)\b|sqs-(icon|hint)|::checkmark/
  switch (drop) {
  case 'stage1': return found.filter(f => f.picker).map(f => remove(f.rule))
  case 'stage2': return found.filter(f => !f.picker && !tokens(f.rule)).map(f => remove(f.rule))
  case 'pickerNative': return found.filter(f => f.picker && f.rule.selectorText.includes('::picker(select)') && f.rule.style.appearance).map(({ rule }) => {
    rule.selectorText = top(rule.selectorText).filter(s => !s.includes('::picker(')).join(', ')
    return rule.selectorText
  })
  case 'pickerBox': return found.filter(f => f.picker && f.rule.selectorText.endsWith('::picker(select)') && !f.rule.style.appearance).map(f => remove(f.rule))
  case 'options': return found.filter(f => list.test(f.rule.selectorText) && !f.rule.selectorText.includes(':has(')).map(f => remove(f.rule))
  case 'padding': return props(/^padding/)
  case 'chevron': return props(/^background-(image|size|repeat|position)/)
  case 'ellipsis': return props(/^(white-space|white-space-collapse|text-wrap|text-wrap-mode|text-overflow|overflow|overflow-x|overflow-y)$/)
  case 'radius': return props(/radius$/)
  }
}, drop)

async function open(page: Page, name: Name) {
  await page.goto(`check/${name}.html`, { waitUntil: 'load' })
  await page.locator('h1').waitFor()
  const { drop } = variants[name] as Variant
  const dropped = drop ? await strip(page, drop) : []
  if (drop) expect(dropped, `something was taken out for ${drop}`).not.toEqual([])
  return dropped
}

// the screen reader starts from the link, never from a select
async function start(page: Page, reader: Reader) {
  await reader.navigateToWebContent()
  await page.locator('a').focus()
  expect(await page.evaluate(() => document.activeElement?.tagName), 'focus is not on a select').not.toBe('SELECT')
}

const appearance = (page: Page) => page.locator('#species').evaluate(el => getComputedStyle(el).appearance)
const voiceOver = () => test.info().project.name.startsWith('voiceover')

async function note(page: Page, name: string, data: unknown) {
  const info = test.info()
  if (!info.annotations.some(a => a.type === 'environment')) {
    info.annotations.push({ type: 'environment', description: `${process.platform} ${release()}, ${info.project.name}, browser ${page.context().browser()?.version()}` })
  }
  await info.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' })
}

const says = (phrase: string, ...words: (string | RegExp)[]) => {
  for (const word of words) expect(phrase, `spoken: "${phrase}"`).toMatch(word)
}

// one test per variant keeps each one short; the phrases with "group" are listed as an annotation
for (const name of names) {
  test(`reading the page: ${name}`, async ({ page, screenReader }) => {
    test.skip(!voiceOver(), 'the group announcement is a VoiceOver finding')
    const reader = screenReader as unknown as Reader
    await serve(page)
    const dropped = await open(page, name)
    await start(page, reader)
    const phrases = [await reader.lastSpokenPhrase()]
    for (let i = 0; i < 30 && !phrases.at(-1)!.includes('Please choose a species'); i++) {
      await reader.next()
      phrases.push(await reader.lastSpokenPhrase())
    }
    const group = phrases.filter(p => /\bgroup\b/i.test(p))
    test.info().annotations.push({ type: 'group', description: group.join(' | ') || 'none' })
    await note(page, 'reading', { variant: name, appearance: await appearance(page), dropped, phrases, group })
    says(phrases.join(' | '), 'Species', 'Sold out', 'Habitats', 'Diet', 'Checked species', 'Please choose a species')
  })
}

// the rotor list and VO-Command-J must reach every select, also with the class
for (const name of ['with', 'without'] as const) {
  test(`form controls in rotor and quick navigation: ${name}`, async ({ page, screenReader }) => {
    test.skip(!voiceOver(), 'VoiceOver commands')
    const reader = screenReader as unknown as Reader
    await serve(page)
    await open(page, name)
    await start(page, reader)
    const quick: string[] = []
    for (let i = 0; i < 6; i++) {
      await reader.perform(reader.keyboardCommands.findNextControl)
      quick.push(await reader.lastSpokenPhrase())
    }
    await page.locator('a').focus()
    await reader.perform(reader.keyboardCommands.openWebItemRotor)
    const rotor = [await reader.lastSpokenPhrase()]
    for (let i = 0; i < 12 && !/form control/i.test(rotor.at(-1)!); i++) {
      await reader.perform({ keyCode: keys.right })
      rotor.push(await reader.lastSpokenPhrase())
    }
    const menu = /form control/i.test(rotor.at(-1)!)
    for (let i = 0; menu && i < 6; i++) {
      await reader.perform({ keyCode: keys.down })
      rotor.push(await reader.lastSpokenPhrase())
    }
    await reader.perform({ keyCode: keys.escape })
    await note(page, 'controls', { variant: name, quick, rotor })
    expect.soft(quick.join(' | '), 'quick navigation reaches the selects').toMatch(/Species[\s\S]*Checked species/)
    expect.soft(menu, 'the rotor has a form controls list').toBe(true)
    for (const label of ['Species', 'Habitats', 'Diet', 'Checked species']) {
      expect.soft(rotor.join(' | '), `rotor lists ${label}`).toContain(label)
    }
  })
}

// real key presses through the screen reader, so the native popup of the bare select gets them too
for (const name of ['with', 'without'] as const) {
  test(`choosing with the keyboard announces the new value: ${name}`, async ({ page, screenReader }) => {
    test.skip(!voiceOver() && name === 'without', 'the native popup is not part of this check with NVDA')
    const reader = screenReader as unknown as Reader
    await serve(page)
    await open(page, name)
    const path = await appearance(page)
    test.info().annotations.push({ type: 'appearance', description: path })
    await start(page, reader)
    const select = page.locator('#species')
    // every phrase spoken in the second after the action, not only the last one
    const step = async (action: () => Promise<unknown>) => {
      await reader.clearSpokenPhraseLog()
      await action()
      await page.waitForTimeout(1500)
      return (await reader.spokenPhraseLog()).join(' | ')
    }
    const press = (key: 'down' | 'enter') => voiceOver() ? reader.perform({ keyCode: keys[key] }) : page.keyboard.press(key === 'down' ? 'ArrowDown' : 'Enter')
    // macOS opens a select with the arrow keys, not with Enter
    const spoken = {
      focus: await step(() => select.focus()),
      open: await step(() => press(voiceOver() ? 'down' : 'enter')),
      next: await step(() => press('down')),
      choose: await step(() => press('enter')),
    }
    const value = await select.inputValue()
    await note(page, 'choose', { variant: name, appearance: path, spoken, value })
    expect.soft(value, 'the second option is chosen').toBe('Grey squirrel')
    expect.soft(spoken.open, 'opening is announced').toMatch(/expanded|menu|Red squirrel/i)
    expect.soft(spoken.next, 'the active option is announced').toContain('Grey squirrel')
    expect.soft(spoken.choose, 'the new value is announced').toContain('Grey squirrel')
  })
}
