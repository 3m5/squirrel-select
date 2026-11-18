import { screenReaderTest as test } from '@guidepup/playwright'
import { expect, type Page } from '@playwright/test'
import { existsSync, statSync } from 'node:fs'
import { release } from 'node:os'
import { join } from 'node:path'

type Reader = {
  navigateToWebContent(): Promise<void>
  next(): Promise<void>
  lastSpokenPhrase(): Promise<string>
  capture<T>(action: () => Promise<T>): Promise<{ spokenPhrase: string }>
}

// base: the browser's base-select alone, to tell its own wording from that of the stylesheet
const variants = {
  with: { cls: ' class="sqs"', head: '' },
  without: { cls: '', head: '' },
  base: { cls: '', head: '<style>select { appearance: base-select }</style>' },
}
type Variant = keyof typeof variants

// the same markup each time, so any difference in what is spoken comes from the stylesheet;
// the link comes first so that the first Tab of the screen reader does not land on a select
const markup = ({ cls, head }: { cls: string, head: string }) => `<!doctype html>
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
<p><label for="checked">Checked species</label> <select${cls} id="checked" aria-invalid="true" aria-describedby="checked-error"><option value="">Choose a species …</option><option>Red squirrel</option></select></p>
<p id="checked-error">Please choose a species.</p>
</main>
</body>
</html>
`

async function serve(page: Page) {
  await page.context().route('http://sqs.test/**', route => {
    const { pathname } = new URL(route.request().url())
    const check = pathname.match(/^\/squirrel-select\/check\/(with|without|base)\.html$/)
    if (check) return route.fulfill({ contentType: 'text/html', body: markup(variants[check[1] as Variant]) })
    const file = join(process.cwd(), '_site', pathname.replace(/^\/squirrel-select\//, ''))
    return pathname.startsWith('/squirrel-select/') && existsSync(file) && statSync(file).isFile() ? route.fulfill({ path: file }) : route.fulfill({ status: 404 })
  })
}

async function open(page: Page, variant: Variant) {
  await page.goto(`check/${variant}.html`, { waitUntil: 'load' })
  await page.locator('h1').waitFor()
}

const appearance = (page: Page) => page.locator('#species').evaluate(el => getComputedStyle(el).appearance)

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

test('reading the page sounds the same with and without the class', async ({ page, screenReader }) => {
  const reader: Reader = screenReader
  await serve(page)
  const transcripts: Record<string, string[]> = {}
  for (const variant of ['with', 'without', 'base'] as const) {
    await open(page, variant)
    await reader.navigateToWebContent()
    // on a focused select NVDA stays in focus mode, and next() would change the value instead of reading on
    expect(await page.evaluate(() => document.activeElement?.tagName), 'focus is not on a select').not.toBe('SELECT')
    const phrases = [await reader.lastSpokenPhrase()]
    for (let i = 0; i < 20 && !phrases.at(-1)!.includes('Please choose a species'); i++) {
      await reader.next()
      phrases.push(await reader.lastSpokenPhrase())
    }
    transcripts[variant] = phrases
  }
  await note(page, 'reading', transcripts)
  says(transcripts.with.join(' | '), 'Species', 'Red squirrel', 'Sold out', 'Checked species', 'Please choose a species')
  // the first phrase can still carry the start-up announcement of the screen reader
  expect.soft(transcripts.with.slice(1), 'same words with and without the class').toEqual(transcripts.without.slice(1))
})

test('focus announces label, value and state', async ({ page, screenReader }) => {
  const reader: Reader = screenReader
  await serve(page)
  const spoken: Record<string, Record<string, string>> = {}
  for (const variant of ['with', 'without'] as const) {
    await open(page, variant)
    await reader.navigateToWebContent()
    spoken[variant] = {
      appearance: await appearance(page),
      species: (await reader.capture(() => page.locator('#species').focus())).spokenPhrase,
      checked: (await reader.capture(() => page.locator('#checked').focus())).spokenPhrase,
    }
  }
  await note(page, 'focus', spoken)
  says(spoken.with.species, 'Species', 'Red squirrel')
  says(spoken.with.checked, 'Checked species')
  expect.soft(spoken.with.checked, 'invalid state').toMatch(/invalid/i)
  expect.soft(spoken.with.checked, 'description').toContain('Please choose a species')
  expect.soft(spoken.with.species, 'same words with and without the class').toBe(spoken.without.species)
  expect.soft(spoken.with.checked, 'same words with and without the class').toBe(spoken.without.checked)
})

test('choosing with the keyboard announces the new value', async ({ page, screenReader }) => {
  const reader: Reader = screenReader
  await serve(page)
  await open(page, 'with')
  const path = await appearance(page)
  test.info().annotations.push({ type: 'appearance', description: path })
  test.skip(path !== 'base-select', 'the open list is the browser’s own here')
  await reader.navigateToWebContent()
  const select = page.locator('#species')
  const step = async (action: () => Promise<unknown>) => (await reader.capture(async () => { await action() })).spokenPhrase
  // macOS opens a select with the arrow keys, not with Enter
  const openKey = test.info().project.name.startsWith('voiceover') ? 'ArrowDown' : 'Enter'
  const spoken = {
    focus: await step(() => select.focus()),
    open: await step(() => page.keyboard.press(openKey)),
    next: await step(() => page.keyboard.press('ArrowDown')),
    choose: await step(() => page.keyboard.press('Enter')),
  }
  await note(page, 'choose', spoken)
  await expect(select).toHaveValue('Grey squirrel')
  expect(await select.evaluate(el => el.matches(':open'))).toBe(false)
  expect.soft(spoken.open, 'opening is announced').toMatch(/expanded|Red squirrel/i)
  expect.soft(spoken.next, 'the active option is announced').toContain('Grey squirrel')
  expect.soft(spoken.choose, 'the new value is announced').toContain('Grey squirrel')
})
