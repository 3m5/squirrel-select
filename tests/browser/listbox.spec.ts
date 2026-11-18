import { test, expect, gotoStates, project } from './fixtures.ts'
import type { Page } from '@playwright/test'

// multiple and size > 1 keep the browser's list box: only borders, colours and spacing may change
const lists = {
  multiple: '#s-multiple',
  size: '#s-size',
  disabled: '#s-multiple-disabled',
  required: '#s-multiple-invalid',
  rtl: '#s-multiple-rtl',
}
const isWebKit = () => project().startsWith('webkit')

// the lists sit far down the page, so tabbing starts at the field just before them
async function tabTo(page: Page, id: string) {
  await page.locator('#s-rtl').focus()
  for (let i = 0; i < 10 && !(await page.locator(id).evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(page.locator(id)).toBeFocused()
}

async function open(page: Page) {
  await gotoStates(page)
  // multiple with size="1" stays native, size="0" stays a field, and an empty option in a list is no placeholder
  await page.locator('#fall-multiple-rtl').evaluate(figure => figure.parentElement!.insertAdjacentHTML('beforeend', `
    <figure class="fall"><figcaption><label for="t-multiple-size1">Multiple, size 1</label></figcaption>
      <select class="sqs" id="t-multiple-size1" multiple size="1"><option selected>Red squirrel</option><option>Grey squirrel</option><option selected>Hazel dormouse</option></select></figure>
    <figure class="fall"><figcaption><label for="t-size0">Size 0</label></figcaption>
      <select class="sqs" id="t-size0" size="0"><option>Red squirrel</option><option>Grey squirrel</option></select></figure>
    <figure class="fall"><figcaption><label for="t-empty">List with an empty option</label></figcaption>
      <select class="sqs" id="t-empty" multiple><option value="" selected>Choose …</option><option>Red squirrel</option></select></figure>`))
}

const setCore = (page: Page, on: boolean) => page.evaluate(on => {
  [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))!.disabled = !on
}, on)

// resolves a token or system colour in the context of an element
function resolveColor(el: Element, color: string) {
  const probe = el.appendChild(document.createElement('span'))
  probe.style.color = color
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}
type WithResolve = { resolveColor: typeof resolveColor }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(`window.resolveColor = ${resolveColor}`)
})

const luminance = (c: number[]) => c.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// colours as canvas pixels, so light-dark(), color-mix() and oklab come back as sRGB
async function toRgb(page: Page, colors: string[]) {
  return page.evaluate(colors => colors.map(color => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
  }), colors)
}

// decodes an element screenshot in the page, scaled to CSS pixels
async function pixels(page: Page, selector: string) {
  // element screenshots wait forever for an option of a WebKit list box, so the page shot is clipped to its box
  const clip = await page.locator(selector).first().evaluate(el => {
    el.closest('select')!.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  const png = (await page.screenshot({ clip })).toString('base64')
  return page.evaluate(async png => {
    const img = new Image()
    img.src = `data:image/png;base64,${png}`
    await img.decode()
    const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, img.width, img.height)
    const scale = img.width / Math.round(img.width / devicePixelRatio)
    const at = (x: number, y: number) => {
      const i = (Math.floor(y * scale) * img.width + Math.floor(x * scale)) * 4
      return [data[i], data[i + 1], data[i + 2]]
    }
    const counts = new Map<string, number>()
    for (let i = 0; i < data.length; i += 4) counts.set(`${data[i]},${data[i + 1]},${data[i + 2]}`, (counts.get(`${data[i]},${data[i + 1]},${data[i + 2]}`) ?? 0) + 1)
    const width = img.width / scale, height = img.height / scale
    const mid = Math.floor(height / 2)
    return {
      width,
      common: [...counts].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number),
      start: [0, 1, 2].map(x => at(x, mid)),
      end: [1, 2, 3].map(x => at(width - x, mid)),
      inside: [at(8, mid), at(width - 9, mid)],
    }
  }, png)
}
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= 8)

test('accessibility tree is the same as without the stylesheet', async ({ page }) => {
  await open(page)
  const ids = Object.values(lists)
  const snapshot = () => Promise.all(ids.map(id => page.locator(id).ariaSnapshot()))
  const styled = await snapshot()
  await setCore(page, false)
  expect(await snapshot()).toEqual(styled)
  await setCore(page, true)
  expect(styled[0]).toContain('listbox')

  if (project() !== 'chromium') return
  const cdp = await page.context().newCDPSession(page)
  const tree = async () => {
    const { root } = await cdp.send('DOM.getDocument')
    return Promise.all(ids.map(async id => {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: id })
      const { nodes: [node] } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })
      const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `${id} option` })
      const selected = await Promise.all(nodeIds.map(async nodeId => {
        const { nodes: [option] } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })
        return option.properties?.find(p => p.name === 'selected')?.value.value === true
      }))
      return { id, role: node.role?.value, multiselectable: node.properties?.find(p => p.name === 'multiselectable')?.value.value === true, selected }
    }))
  }
  const styledTree = await tree()
  await setCore(page, false)
  expect(await tree()).toEqual(styledTree)
  await setCore(page, true)
  for (const { id, role, multiselectable, selected } of styledTree) {
    expect(role, id).toBe('listbox')
    expect(multiselectable, `${id} multiselectable`).toBe(id !== lists.size)
    // Chromium reports no selected options in a disabled list, with or without the stylesheet
    if (id !== lists.disabled) expect(selected, `${id} selected options`).toEqual(await page.locator(`${id} option`).evaluateAll(os => os.map(o => (o as HTMLOptionElement).selected)))
  }
})

// Chromium draws it as a field with a popup, Firefox and WebKit as a one-row list, so it is left alone
for (const forcedColors of ['none', 'active'] as const) {
  test(`multiple size="1" stays exactly native, forced colors ${forcedColors}`, async ({ page }) => {
    test.skip(forcedColors === 'active' && !['chromium', 'firefox'].includes(project()), 'forced-colors emulation paints system colors only here')
    await page.emulateMedia({ forcedColors })
    await open(page)
    const diffs = await page.locator('#t-multiple-size1').evaluate(select => {
      const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))!
      const els = [select, ...select.querySelectorAll('option, optgroup')]
      const dump = () => els.map(el => {
        const cs = getComputedStyle(el)
        return Object.fromEntries([...cs].filter(p => !p.startsWith('--')).map(p => [p, cs.getPropertyValue(p)]))
      })
      const styled = dump()
      sheet.disabled = true
      const plain = dump()
      sheet.disabled = false
      return styled.flatMap((props, i) => Object.keys(props).filter(p => props[p] !== plain[i][p]).map(p => `${els[i].tagName.toLowerCase()} ${p}: ${props[p]} / ${plain[i][p]}`))
    })
    expect(diffs).toEqual([])
  })
}

test('keyboard behaves as without the stylesheet', async ({ page }) => {
  const run = async (core: boolean) => {
    await open(page)
    await setCore(page, core)
    const select = page.locator(lists.multiple)
    await select.focus()
    const state = () => select.evaluate(el => `${[...(el as HTMLSelectElement).selectedOptions].map(o => o.text).join(' + ')} @${document.activeElement?.id}`)
    const steps = [await state()]
    for (const key of ['ArrowDown', 'Shift+ArrowDown', 'Control+ArrowDown', 'Control+Space', 'Space', 'Home', 'End', 'Control+a']) {
      await page.keyboard.press(key)
      steps.push(`${key}: ${await state()}`)
    }
    return steps
  }
  const styled = await run(true)
  expect(styled).toEqual(await run(false))
  expect(styled.every(s => s.endsWith('@s-multiple')), 'focus stays on the select').toBe(true)
  expect(new Set(styled.map(s => s.replace(/^.*?: /, ''))).size, 'the keys change the selection').toBeGreaterThan(2)
})

test('mouse behaves as without the stylesheet', async ({ page }) => {
  test.skip(isWebKit(), 'Playwright does not click options of a WebKit list box')
  const run = async (core: boolean) => {
    await open(page)
    await setCore(page, core)
    const steps: string[] = []
    for (const [index, modifier] of [[3, ''], [4, 'Control'], [0, 'Shift']] as const) {
      const [x, y] = await page.locator(lists.multiple).evaluate((el, index) => {
        const option = (el as HTMLSelectElement).options[index]
        option.scrollIntoView({ block: 'nearest' })
        const r = option.getBoundingClientRect()
        return [r.x + r.width / 2, r.y + r.height / 2]
      }, index)
      if (modifier) await page.keyboard.down(modifier)
      await page.mouse.click(x, y)
      if (modifier) await page.keyboard.up(modifier)
      steps.push(await page.locator(lists.multiple).evaluate(el => [...(el as HTMLSelectElement).selectedOptions].map(o => o.text).join(' + ')))
    }
    return steps
  }
  const styled = await run(true)
  expect(styled).toEqual(await run(false))
  expect(styled[0]).toBe('Hazel dormouse')
})

test('form value, reset and :user-invalid work as without the stylesheet', async ({ page }) => {
  // no border transition, so the colour can be read right away
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const select = page.locator(lists.required)
  // without aria-invalid only :user-invalid can turn the border red
  await select.evaluate(el => el.removeAttribute('aria-invalid'))
  const values = () => select.evaluate(el => new FormData((el as HTMLSelectElement).form!).getAll('species'))
  await select.selectOption(['Red squirrel', 'Hazel dormouse'])
  expect(await values()).toEqual(['Red squirrel', 'Hazel dormouse'])
  await select.evaluate(el => (el as HTMLSelectElement).form!.reset())
  expect(await values()).toEqual([])
  const state = () => select.evaluate(el => ({
    invalid: el.matches(':user-invalid'),
    border: getComputedStyle(el).borderTopColor,
    token: (window as unknown as WithResolve).resolveColor(el, 'var(--_sqs-invalid)'),
  }))
  const before = await state()
  expect(before.invalid).toBe(false)
  expect(before.border).not.toBe(before.token)
  await select.evaluate(el => (el as HTMLSelectElement).form!.requestSubmit())
  const after = await state()
  expect(after.invalid).toBe(true)
  expect(after.border).toBe(after.token)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`list colours meet WCAG contrast, ${colorScheme}`, async ({ page }) => {
    test.skip(project() !== 'chromium', 'colours do not depend on the engine')
    await page.emulateMedia({ colorScheme })
    await open(page)
    const scopes = ['#fall-default', '#fall-look-moss', '#fall-look-steel', '#fall-look-coral']
    const measured = await page.evaluate(scopes => scopes.map(scope => {
      const toColor = (window as unknown as WithResolve).resolveColor
      const host = document.querySelector(scope)!
      host.insertAdjacentHTML('beforeend', '<select class="sqs" multiple><optgroup label="Group"><option selected>Chosen</option><option>Other</option></optgroup></select>')
      const select = host.lastElementChild as HTMLSelectElement
      const [chosen, other] = [...select.options].map(o => getComputedStyle(o))
      const list = getComputedStyle(select)
      const colors = {
        text: chosen.color, chosen: chosen.backgroundColor, bar: chosen.backgroundImage.match(/(rgb|oklab|color)\([^)]*\)/)![0],
        other: other.color, surface: list.backgroundColor, group: getComputedStyle(select.querySelector('optgroup')!).color,
        border: list.borderTopColor, page: getComputedStyle(document.body).backgroundColor,
        hover: toColor(select, 'var(--_sqs-hover)'), strong: toColor(select, 'var(--_sqs-selected-strong)'),
      }
      select.remove()
      return colors
    }), scopes)
    const pairs = [
      ['text', 'chosen', 4.5], ['text', 'strong', 4.5], ['other', 'surface', 4.5], ['other', 'hover', 4.5],
      ['group', 'surface', 4.5], ['group', 'hover', 4.5], ['bar', 'chosen', 3], ['bar', 'strong', 3],
      ['border', 'surface', 3], ['border', 'page', 3],
    ] as const
    const failures: string[] = []
    for (const [i, colors] of measured.entries()) {
      const keys = Object.keys(colors) as (keyof typeof colors)[]
      const rgb = Object.fromEntries((await toRgb(page, keys.map(k => colors[k]))).map((c, j) => [keys[j], c]))
      for (const [fg, bg, min] of pairs) {
        const r = ratio(rgb[fg], rgb[bg])
        if (r < min) failures.push(`${scopes[i]}: ${fg} on ${bg} ${r.toFixed(2)} < ${min}`)
      }
    }
    expect(failures).toEqual([])
  })
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`WebKit: text on the system grey of a chosen option keeps 4.5:1, ${colorScheme}`, async ({ page }) => {
    test.skip(project() !== 'webkit', 'only WebKit keeps its own grey for chosen options')
    await page.emulateMedia({ colorScheme })
    await open(page)
    await page.locator(lists.multiple).evaluate(el => (el as HTMLSelectElement).blur())
    const { common } = await pixels(page, `${lists.multiple} option:checked`)
    const [text] = await toRgb(page, [await page.locator(`${lists.multiple} option:checked`).first().evaluate(o => getComputedStyle(o).color)])
    expect(ratio(text, common), `text ${text} on ${common}`).toBeGreaterThanOrEqual(4.5)
  })
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`disabled list with groups: groups are not lighter than the list, ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await open(page)
    const colors = await page.locator('#fall-multiple-disabled').evaluate(figure => {
      figure.insertAdjacentHTML('beforeend', `<select class="sqs" id="t-disabled-groups" multiple disabled>
        <optgroup label="Tree squirrels"><option selected>Red squirrel</option><option>Grey squirrel</option></optgroup>
        <optgroup label="Dormice"><option>Hazel dormouse</option><option selected>Edible dormouse</option></optgroup></select>`)
      const select = figure.querySelector('#t-disabled-groups')!
      const areas = [...select.querySelectorAll('optgroup, option:not(:checked)')]
      return { list: getComputedStyle(select).backgroundColor, areas: areas.map(el => [`${el.tagName.toLowerCase()} ${el.getAttribute('label') ?? el.textContent}`, getComputedStyle(el).backgroundColor]) }
    })
    // a transparent area shows the list; anything else is painted over it and must not be lighter
    const rgba = await page.evaluate(colors => colors.map(color => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data]
    }), [colors.list, ...colors.areas.map(([, color]) => color)])
    const [list, ...areas] = rgba.map(([r, g, b, a]) => ({ rgb: [r, g, b], a: a / 255 }))
    const lighter = colors.areas.filter((_, i) => {
      const { rgb, a } = areas[i]
      const shown = rgb.map((v, j) => v * a + list.rgb[j] * (1 - a))
      return luminance(shown) > luminance(list.rgb) + 0.001
    }).map(([name, color]) => `${name}: ${color} on ${colors.list}`)
    expect(lighter).toEqual([])
  })
}

test('chosen is not only a colour: weight and an accent bar at the start of the row', async ({ page }) => {
  test.skip(isWebKit(), 'system highlight: WebKit paints chosen options in its own grey')
  await open(page)
  for (const id of [lists.multiple, lists.rtl]) {
    const option = `${id} option:checked`
    await page.locator(id).evaluate(el => (el as HTMLSelectElement).blur())
    const style = await page.locator(option).first().evaluate(o => {
      const cs = getComputedStyle(o)
      return { weight: Number(cs.fontWeight), image: cs.backgroundImage, accent: (window as unknown as WithResolve).resolveColor(o.closest('select')!, 'var(--_sqs-accent)') }
    })
    expect(style.weight, id).toBeGreaterThanOrEqual(600)
    expect(style.image, id).toContain('gradient')
    const [accent] = await toRgb(page, [style.accent])
    const shot = await pixels(page, option)
    const [bar, other] = id === lists.rtl ? [shot.end, shot.inside[1]] : [shot.start, shot.inside[0]]
    for (const px of bar) expect(near(px, accent), `${id}: bar pixel ${px}, accent ${accent}`).toBe(true)
    expect(near(other, accent), `${id}: the bar is only 3px wide`).toBe(false)
  }
})

test('focus ring on the list, the browser keeps its highlight', async ({ page }) => {
  await open(page)
  const select = page.locator(lists.multiple)
  await tabTo(page, lists.multiple)
  const outline = await select.evaluate(el => {
    const cs = getComputedStyle(el)
    return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), offset: cs.outlineOffset }
  })
  expect(outline).toEqual({ style: 'solid', width: expect.any(Number), offset: '2px' })
  expect(outline.width).toBeGreaterThanOrEqual(2)
  if (isWebKit()) return
  const highlight = () => page.locator(`${lists.multiple} option:checked`).first().evaluate(o => {
    const cs = getComputedStyle(o)
    return { color: cs.backgroundColor, image: cs.backgroundImage }
  })
  const styled = await highlight()
  await setCore(page, false)
  await expect(select).toBeFocused()
  expect(styled).toEqual(await highlight())
})

test('the active option looks as without the stylesheet', async ({ page }) => {
  const run = async (core: boolean) => {
    await open(page)
    await setCore(page, core)
    await page.locator(lists.multiple).focus()
    await page.keyboard.press('Control+ArrowDown')
    return page.locator(`${lists.multiple} option`).evaluateAll(os => os.map(o => {
      const cs = getComputedStyle(o)
      return cs.outlineStyle === 'none' ? 'none' : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`
    }))
  }
  expect(await run(true)).toEqual(await run(false))
})

test('rows: at least 24px, never smaller than the browser’s own at the same text size', async ({ page }) => {
  await open(page)
  const select = page.locator(lists.multiple)
  const measure = () => select.evaluate(el => ({
    rows: [...(el as HTMLSelectElement).options].map(o => o.getBoundingClientRect().height),
    font: parseFloat(getComputedStyle(el).fontSize),
    root: parseFloat(getComputedStyle(document.documentElement).fontSize),
  }))
  const styled = await measure()
  expect(styled.font, 'list text is not smaller than the page text').toBeGreaterThanOrEqual(styled.root)
  if (isWebKit()) {
    await setCore(page, false)
    await select.evaluate((el, font) => { (el as HTMLElement).style.fontSize = `${font}px` }, styled.font)
    const plain = await measure()
    expect(Math.min(...styled.rows)).toBeGreaterThanOrEqual(Math.min(...plain.rows) - 0.5)
    test.info().annotations.push({ type: 'system row height', description: `${Math.min(...styled.rows)}px, WebKit sets the row height` })
    return
  }
  expect(Math.min(...styled.rows)).toBeGreaterThanOrEqual(24)
  if (project().endsWith('-touch')) {
    expect(styled.font).toBeGreaterThanOrEqual(16)
    test.info().annotations.push({ type: 'touch target', description: `smallest row ${Math.min(...styled.rows)}px (recommended 44px)` })
  }
})

for (const [name, css, width] of [
  ['320px', '', 320],
  ['text at 200%', 'html { font-size: 200% !important }', 640],
  ['text spacing (1.4.12)', '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important }', 1024],
] as const) {
  test(`lists at ${name}: no horizontal scrolling, size="4" shows four rows`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await open(page)
    if (css) await page.addStyleTag({ content: css })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    const size = await page.locator(lists.size).evaluate(el => {
      const probe = el.parentElement!.appendChild(document.createElement('div'))
      probe.className = 'sqs'
      probe.style.cssText = 'all: initial; display: block; block-size: var(--_sqs-list-max)'
      const max = probe.getBoundingClientRect().height
      probe.remove()
      return { visible: (el as HTMLElement).clientHeight, row: (el as HTMLSelectElement).options[0].getBoundingClientRect().height, max, outer: el.getBoundingClientRect().height }
    })
    if (size.outer < size.max - 1) expect(size.visible, JSON.stringify(size)).toBeGreaterThanOrEqual(4 * size.row - 1)
    if (project() !== 'chromium') return
    const clipped = await page.locator(Object.values(lists).map(id => `${id} option`).join(', ')).evaluateAll(os =>
      os.filter(o => o.scrollWidth > o.clientWidth + 1).map(o => o.textContent))
    expect(clipped).toEqual([])
  })
}

test('forced colors: system selection colours, native list, dashed error, visible focus', async ({ page }) => {
  test.skip(!['chromium', 'firefox'].includes(project()), 'forced-colors emulation paints system colors only here')
  await page.emulateMedia({ forcedColors: 'active' })
  await open(page)
  const select = page.locator(lists.multiple)
  await select.evaluate(el => (el as HTMLSelectElement).blur())
  const colors = await select.evaluate(el => {
    const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))!
    const probe = document.body.appendChild(document.createElement('div'))
    probe.style.backgroundColor = 'SelectedItem'
    const selectedItem = getComputedStyle(probe).backgroundColor
    probe.remove()
    const options = [...(el as HTMLSelectElement).options]
    sheet.disabled = true
    const native = getComputedStyle(options.find(o => o.selected)!).backgroundColor
    sheet.disabled = false
    return {
      selectedItem,
      native,
      chosen: getComputedStyle(options.find(o => o.selected)!).backgroundColor,
      other: getComputedStyle(options.find(o => !o.selected && !o.disabled)!).backgroundColor,
      appearance: getComputedStyle(el).appearance,
    }
  })
  // Chromium keeps its own selection colour in lists (forced-color-adjust: none), Firefox needs SelectedItem from us
  expect(colors.chosen).toBe(project() === 'chromium' ? colors.native : colors.selectedItem)
  expect(colors.other).not.toBe(colors.chosen)
  expect(colors.appearance).toBe('auto')

  const required = page.locator(lists.required)
  await required.evaluate(el => el.removeAttribute('aria-invalid'))
  await required.evaluate(el => (el as HTMLSelectElement).form!.requestSubmit())
  expect(await required.evaluate(el => [getComputedStyle(el).borderTopStyle, getComputedStyle(el).borderTopWidth])).toEqual(['dashed', '2px'])

  await tabTo(page, lists.multiple)
  expect(await select.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
})

test('reduced motion turns off the list transition', async ({ page }) => {
  await open(page)
  const duration = () => page.locator(lists.multiple).evaluate(el => getComputedStyle(el).transitionDuration)
  expect(await duration()).toBe('0.12s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(duration).toBe('0s')
})

test('lists get no base-select, no arrow and no placeholder rules; size 0 and 1 stay fields', async ({ page }) => {
  await open(page)
  const looks = (id: string) => page.locator(id).evaluate(el => ({ appearance: getComputedStyle(el).appearance, arrow: getComputedStyle(el).backgroundImage !== 'none', color: getComputedStyle(el).color }))
  for (const id of [...Object.values(lists), '#t-empty']) {
    const list = await looks(id)
    expect(list.appearance, id).not.toBe('base-select')
    expect(list.arrow, `${id} arrow`).toBe(false)
  }
  const field = await looks('#s-default')
  expect(await looks('#t-size0')).toEqual(field)
  expect((await looks('#t-empty')).color, 'an empty option in a list is no placeholder').toBe((await looks(lists.multiple)).color)

  const matches = await page.evaluate(ids => {
    const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/dist/squirrel-select.css'))!
    const targets = ids.flatMap(id => { const el = document.querySelector(id)!; return [el, ...el.querySelectorAll('*')] })
    const split = (text: string) => {
      const out = ['']
      let depth = 0
      for (const ch of text) {
        depth += ch === '(' ? 1 : ch === ')' ? -1 : 0
        if (ch === ',' && depth === 0) out.push('')
        else out[out.length - 1] += ch
      }
      return out.map(s => s.trim())
    }
    const found: string[] = []
    const walk = (rules: CSSRuleList) => {
      for (const r of rules) {
        if (r instanceof CSSStyleRule) {
          for (const selector of split(r.selectorText)) {
            const risky = /option\[value=""\]|selectedcontent/.test(selector) || r.style.appearance === 'base-select'
            if (!risky) continue
            const plain = selector.replace(/::[\w-]+(\([^)]*\))?/g, '')
            try {
              if (targets.some(el => el.matches(plain))) found.push(selector)
            } catch {
              // selectors this engine cannot match cannot apply either
            }
          }
        }
        if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules)
      }
    }
    walk(sheet.cssRules)
    return found
  }, [...Object.values(lists), '#t-empty'])
  expect(matches).toEqual([])
})
