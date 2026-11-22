const $ = (s, root = document) => root.querySelector(s)
const $$ = (s, root = document) => [...root.querySelectorAll(s)]

const live = Object.assign(document.createElement('div'), { className: 'visually-hidden' })
live.setAttribute('aria-live', 'polite')
document.body.append(live)
// Same rule as the CSS container queries: the page width in rem of the page, so larger text counts
const widerThan = rem => document.body.clientWidth / parseFloat(getComputedStyle(document.documentElement).fontSize) > rem

const announce = text => {
  live.textContent = ''
  requestAnimationFrame(() => { live.textContent = text })
}

// Appearance. The hero picture follows a manual choice; without one the system decides.
const shotSource = $('.hero-shot source')
const syncShot = value => {
  if (shotSource) shotSource.media = { light: 'all', dark: 'not all' }[value] ?? '(prefers-color-scheme: light)'
}
const scheme = $('#site-scheme')
syncShot(document.documentElement.dataset.scheme)
if (scheme) {
  scheme.value = document.documentElement.dataset.scheme
  scheme.addEventListener('change', () => {
    syncShot(scheme.value)
    document.documentElement.dataset.scheme = scheme.value
    try { localStorage.setItem('squirrel-select-scheme', scheme.value) } catch { /* private mode */ }
  })
}

// Pages below a section, such as docs/theming.html, mark their section in the navigation
const nav = $('.site-nav')
if (nav && !$('[aria-current]', nav)) {
  const root = new URL('./', $('.brand').href)
  for (const a of $$('a[data-section]', nav)) {
    if (location.href.startsWith(new URL(a.dataset.section, root).href)) a.setAttribute('aria-current', 'true')
  }
}

// Docs sub-navigation: always open beside the content, collapsed above it on small screens
const subnav = $('.layout > nav')
if (subnav) {
  const details = document.createElement('details')
  const summary = document.createElement('summary')
  const current = $('[aria-current]', subnav)?.textContent
  summary.textContent = [subnav.getAttribute('aria-label'), current].filter(Boolean).join(' · ')
  details.append(summary, ...subnav.childNodes)
  subnav.append(details)
  const sync = () => { details.open = widerThan(60) }
  addEventListener('resize', sync)
  sync()
}

// Wide tables scroll inside a focusable region instead of widening the page
for (const table of $$('main table')) {
  if (table.closest('.table-scroll')) continue
  const box = Object.assign(document.createElement('div'), { className: 'table-scroll', tabIndex: 0 })
  box.setAttribute('role', 'region')
  box.setAttribute('aria-label', table.caption?.textContent.trim() || 'Table')
  table.replaceWith(box)
  box.append(table)
}

// The caption text stays in view while a wide table scrolls sideways
for (const caption of $$('.table-scroll caption')) {
  const text = Object.assign(document.createElement('span'), { className: 'caption-text' })
  text.append(...caption.childNodes)
  caption.append(text)
}

const COPY_TEXT = {
  en: { copy: 'Copy', copied: 'Copied', announce: 'Copied to the clipboard', failed: 'Select and copy by hand' },
  de: { copy: 'Kopieren', copied: 'Kopiert', announce: 'In die Zwischenablage kopiert', failed: 'Bitte markieren und kopieren' },
}
const copyText = COPY_TEXT[document.documentElement.lang.slice(0, 2)] ?? COPY_TEXT.en

// Code blocks without their own caption get one with a copy button
let codeCount = 0
for (const pre of $$('main pre')) {
  if (pre.closest('figure.code') || pre.matches('.diff, .plain')) continue
  const code = $('code', pre) ?? pre
  code.id ||= `code-${++codeCount}`
  const lang = code.className.match(/language-(\w+)/)?.[1]
  const figure = Object.assign(document.createElement('figure'), { className: 'code' })
  const caption = document.createElement('figcaption')
  const label = document.createElement('span')
  label.textContent = { sh: 'Shell', bash: 'Shell', js: 'JavaScript', ts: 'TypeScript' }[lang] ?? lang?.toUpperCase() ?? 'Code'
  const button = Object.assign(document.createElement('button'), { type: 'button', textContent: copyText.copy })
  button.dataset.copy = code.id
  caption.append(label, button)
  pre.replaceWith(figure)
  figure.append(caption, pre)
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy]')
  if (!button) return
  const source = document.getElementById(button.dataset.copy)
  const text = source.closest('pre') ? source.textContent : source.innerText
  const label = button.dataset.label ??= button.textContent
  try {
    await navigator.clipboard.writeText(text.trim())
    button.textContent = copyText.copied
    announce(copyText.announce)
  } catch {
    button.textContent = copyText.failed
  }
  setTimeout(() => { button.textContent = label }, 2000)
})

// "In your browser": which of the three paths this browser takes
const pathName = $('#path-name')
if (pathName) {
  const names = {
    base: 'Your browser shows the field and the open list styled.',
    fallback: 'Your browser shows the styled field with the system list.',
    touch: 'Your device shows the styled field and opens the native picker.',
    forced: 'Your browser shows the native select in your contrast colors.',
    old: 'Your browser shows its default select; it is too old for the stylesheet.',
  }
  const media = q => matchMedia(q).matches
  const path = !CSS.supports('color', 'light-dark(#000, #fff)') ? 'old'
    : media('(forced-colors: active)') ? 'forced'
      : CSS.supports('appearance', 'base-select') && media('(hover: hover) and (pointer: fine)') ? 'base'
        : media('(pointer: coarse)') ? 'touch' : 'fallback'
  pathName.textContent = names[path]
  pathName.dataset.path = path
  const shotPath = $('.shot-path')
  const shotText = {
    base: 'Your browser shows the open list like this.',
    fallback: 'Your browser shows the system list instead, next to your styled field.',
    touch: 'Your device opens the native picker instead; the field is styled.',
  }[path]
  if (shotPath && shotText) {
    shotPath.textContent = shotText
    shotPath.hidden = false
  }
  for (const li of $$('.paths > li')) {
    const mine = li.dataset.path === path
    li.classList.toggle('current', mine)
    $('.yours', li).hidden = !mine
  }
}

// Before and after: example themes only set --sqs-* tokens
const THEMES = {
  neutral: { hint: 'Default look, no CSS variables changed.', tokens: {} },
  night: {
    hint: 'Example theme in the 3m5 style: navy, cyan, almost square corners. CSS variables only.',
    tokens: {
      '--sqs-bg': '#1b1650', '--sqs-surface': '#231d6e', '--sqs-text': '#fff', '--sqs-muted': '#b8b4ec',
      '--sqs-border': '#7c7ff5', '--sqs-accent': '#1fd3ff', '--sqs-invalid': '#ff9b91', '--sqs-radius': '2px',
      '--sqs-focus-ring': '2px solid light-dark(#2340ff, #1fd3ff)',
    },
  },
  studio: {
    hint: 'Example theme: warm paper, orange, pill shape. CSS variables only.',
    tokens: {
      '--sqs-bg': '#fffaf2', '--sqs-surface': '#fffaf2', '--sqs-text': '#2a2118', '--sqs-muted': '#6b5d4d',
      '--sqs-border': '#8a7a66', '--sqs-accent': '#c2410c', '--sqs-invalid': '#b3261e', '--sqs-radius': '999px',
      '--sqs-focus-ring': '2px solid light-dark(#c2410c, #ffb37a)',
    },
  },
}
const themeTarget = $('#theme-target')
if (themeTarget) {
  const apply = name => {
    const { hint, tokens } = THEMES[name]
    for (const key of Object.values(THEMES).flatMap(t => Object.keys(t.tokens))) themeTarget.style.removeProperty(key)
    for (const [key, value] of Object.entries(tokens)) themeTarget.style.setProperty(key, value)
    themeTarget.closest('.side').dataset.theme = name
    $('#theme-hint').textContent = hint
    const lines = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')
    $('#theme-code code').textContent = lines ? `.my-form {\n${lines}\n}` : '/* Default look: no CSS variables changed. */'
  }
  for (const radio of $$('input[name="theme"]')) radio.addEventListener('change', () => apply(radio.value))
  apply($('input[name="theme"]:checked').value)
}

// "On this page": open beside the content on wide screens, collapsed above it on small ones
const toc = $('main .toc')
if (toc) {
  const title = $('h2', toc)
  const details = document.createElement('details')
  const summary = document.createElement('summary')
  summary.textContent = title.textContent
  title.classList.add('visually-hidden')
  details.append(summary, ...[...toc.childNodes].filter(node => node !== title))
  toc.append(details)
  const sync = () => { details.open = widerThan(76) }
  addEventListener('resize', sync)
  sync()
}

// Menu on small screens: Escape closes it and returns focus to the button
const menu = $('.site-header .menu')
menu?.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !menu.open) return
  menu.open = false
  $('summary', menu).focus()
})

// Playground. Defaults are the library defaults.
const form = $('#playground')
if (form) {
  const COLORS = {
    accent: { token: '--sqs-accent', light: '#2754c5', dark: '#8fb1ff' },
    text: { token: '--sqs-text', light: '#1c2024', dark: '#e4e7eb' },
    bg: { token: '--sqs-bg', light: '#ffffff', dark: '#1b1f24' },
    surface: { token: '--sqs-surface', light: '#ffffff', dark: '#252b32' },
    border: { token: '--sqs-border', light: '#7d8691', dark: '#77818c' },
    muted: { token: '--sqs-muted', light: '#596370', dark: '#a3adb8' },
    invalid: { token: '--sqs-invalid', light: '#b3261e', dark: '#ff9b91' },
  }
  const SIZES = {
    radius: { token: '--sqs-radius', def: 6, unit: 'px', min: 0, max: 24, step: 1 },
    borderWidth: { token: '--sqs-border-width', def: 1, unit: 'px', min: 0, max: 4, step: 1 },
    fontSize: { token: '--sqs-font-size', def: 1, unit: 'rem', min: 0.75, max: 1.5, step: 0.0625 },
    padBlock: { token: '--sqs-padding-block', def: 0.5, unit: 'em', min: 0.25, max: 1, step: 0.125 },
    padInline: { token: '--sqs-padding-inline', def: 0.75, unit: 'em', min: 0.25, max: 1.5, step: 0.125 },
  }
  const both = hex => ({ light: hex, dark: hex })
  const PRESETS = {
    standard: {},
    night: { colors: { accent: both('#1fd3ff'), text: both('#ffffff'), bg: both('#1b1650'), surface: both('#231d6e'), border: both('#7c7ff5'), muted: both('#b8b4ec'), invalid: both('#ff9b91') }, sizes: { radius: 2 } },
    studio: { colors: { accent: both('#c2410c'), text: both('#2a2118'), bg: both('#fffaf2'), surface: both('#fffaf2'), border: both('#8a7a66'), muted: both('#6b5d4d'), invalid: both('#b3261e') }, sizes: { radius: 24 } },
    compact: { sizes: { fontSize: 0.875, padBlock: 0.25, padInline: 0.5, radius: 4 } },
  }
  let state = { colors: {}, sizes: {} }
  let mode = 'light'
  const preview = $('#preview')
  const color = (k, m = mode) => state.colors[k]?.[m] ?? COLORS[k][m]
  const size = k => state.sizes[k] ?? SIZES[k].def
  const fmt = n => String(+n.toFixed(4))
  for (const input of $$('[data-size]', form)) Object.assign(input, SIZES[input.dataset.size])

  const luminance = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const ratio = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
  }

  // Only a change between enough and too weak is announced, not every slider step
  let lastOk = null
  const render = () => {
    const lines = []
    for (const [k, c] of Object.entries(COLORS)) {
      if (!state.colors[k]) { preview.style.removeProperty(c.token); continue }
      const l = color(k, 'light'), d = color(k, 'dark')
      const value = l === d ? l : `light-dark(${l}, ${d})`
      preview.style.setProperty(c.token, value)
      lines.push(`  ${c.token}: ${value};`)
    }
    for (const [k, s] of Object.entries(SIZES)) {
      const v = size(k)
      if (v === s.def) { preview.style.removeProperty(s.token); continue }
      preview.style.setProperty(s.token, fmt(v) + s.unit)
      lines.push(`  ${s.token}: ${fmt(v)}${s.unit};`)
    }
    $('#css-output').textContent = lines.length
      ? `/* Any container works instead of :root. */\n:root {\n${lines.join('\n')}\n}`
      : '/* No CSS variables changed yet. */'
    for (const input of $$('[data-color]', form)) input.value = color(input.dataset.color)
    for (const input of $$('[data-size]', form)) {
      const k = input.dataset.size
      input.value = size(k)
      $(`output[for="${input.id}"]`).textContent = fmt(size(k)) + SIZES[k].unit
    }
    const checks = [
      ['Text on field', color('text'), color('bg'), 4.5],
      ['Placeholder on field', color('muted'), color('bg'), 4.5],
      ['Border on field', color('border'), color('bg'), 3],
      ['Accent on list', color('accent'), color('surface'), 3],
    ].map(([name, a, b, min]) => ({ name, min, r: ratio(a, b), ok: ratio(a, b) >= min }))
    $('#contrast-mode').textContent = mode
    $('#contrast').innerHTML = checks.map(({ name, min, r, ok }) =>
      `<li><span>${name}</span><span class="value" data-ok="${ok}">${r.toFixed(1)}:1 · ${ok ? 'enough' : 'too weak'}</span><small>needs at least ${min}:1</small></li>`).join('')
    const changed = lastOk ? checks.filter((c, i) => c.ok !== lastOk[i]) : []
    if (changed.length) announce(changed.map(c => `${c.name}: ${c.ok ? 'enough' : 'too weak'}`).join('. '))
    lastOk = checks.map(c => c.ok)
  }

  form.addEventListener('submit', e => e.preventDefault())
  for (const input of $$('[data-color]', form)) {
    input.addEventListener('input', () => {
      const k = input.dataset.color
      state.colors[k] = { ...state.colors[k], [mode]: input.value }
      render()
    })
  }
  for (const input of $$('[data-size]', form)) {
    input.addEventListener('input', () => { state.sizes[input.dataset.size] = +input.value; render() })
  }
  $('#preset').addEventListener('change', e => {
    state = structuredClone({ colors: {}, sizes: {}, ...PRESETS[e.target.value] })
    render()
  })
  $('#reset').addEventListener('click', () => {
    state = { colors: {}, sizes: {} }
    $('#preset').value = 'standard'
    render()
    announce('Everything reset')
  })
  $('#preview-scheme').addEventListener('change', e => {
    mode = e.target.value
    preview.dataset.scheme = mode
    $('#color-mode').textContent = mode === 'light' ? 'Light' : 'Dark'
    $('#color-other').textContent = mode === 'light' ? 'Dark' : 'Light'
    render()
  })
  $('#preview-dir').addEventListener('change', e => { preview.dir = e.target.value })
  render()
}
