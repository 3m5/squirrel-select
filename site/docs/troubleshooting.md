# Troubleshooting

The most common reasons why a select does not look the way you expect, and how to check your page in ten seconds.

## My styles do not apply

The stylesheet lives in the cascade layer `squirrel`. **Every rule outside a layer wins**, whatever its specificity. That is on purpose: your own CSS outside a layer always wins. It also means an old global reset overrides us completely:

```css
/* this beats SquirrelSelect */
select { appearance: none; border: 0; }
```

Limit the reset to other selects, or put it in a layer of its own:

```css
select:not(.sqs) { appearance: none; border: 0; }
```

## Tailwind CSS v4

Declare the layer order before importing Tailwind:

```css
@layer theme, base, squirrel, components, utilities;
@import "tailwindcss";
@import "@3m5-de/squirrel-select/squirrel-select.css";
```

Without the first line, `squirrel` ends up after `utilities`, and classes like `rounded-none` on the select have no effect. With `squirrel` first, Tailwind's reset removes our border radius, background and padding. This order gets both right.

## TypeScript reports the CSS import

TypeScript 6 stops at `import '@3m5-de/squirrel-select/squirrel-select.css'` with "Cannot find module or type declarations for side-effect import" (TS2882), because the package ships no type declarations. Add one line to a declaration file, for example `src/css.d.ts`: `declare module '*.css'`. Vite projects already have this through `vite/client`.

## postcss-import cannot find the stylesheet

postcss-import stops at `@import "@3m5-de/squirrel-select/squirrel-select.css"` with "Failed to find", because it does not read the `exports` field of a package, and that field is what maps the import to the file. Give it a `resolve` function that uses Node's resolver, in `postcss.config.mjs`:

```js
import { createRequire } from 'node:module'
import { join } from 'node:path'
import postcssImport from 'postcss-import'

export default {
  plugins: [
    postcssImport({
      resolve: (id, base) => createRequire(join(base, 'x.css')).resolve(id),
    }),
  ],
}
```

Relative imports keep working. Or leave the `@import` to your bundler: Vite and webpack read `exports`.

## The arrow is on the wrong side in right-to-left pages (Vite, Next)

Lightning CSS, the CSS minifier in Vite and in Next with Turbopack, rewrites `:dir(rtl)` into a list of right-to-left languages for older browsers. A page with `dir="rtl"` but without such a `lang` then gets the arrow over the start of the text. The same happens to `sqs-arrow-start` and to the selection bar in lists. Set the CSS targets to the browsers SquirrelSelect needs anyway, in `vite.config.js`:

```js
export default {
  build: { cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'] },
}
```

In Next, in `package.json`:

```json
"browserslist": ["chrome 123", "edge 123", "firefox 120", "safari 17.5"]
```

Older browsers get the default select anyway, so nothing is lost for the select. In Next the list also applies to your JavaScript. Or set `lang` together with `dir`, for example `<html lang="ar" dir="rtl">`.

## Bootstrap and other frameworks

Do not combine `.sqs` with `.form-select` or similar classes. Their CSS is not in a layer and wins.

## The open list ignores my rule

Rules with `::picker(select)`, `::checkmark` or `:open` must not share a selector list with other selectors. Firefox does not know them and drops the whole rule, including the parts it knows. Write them on their own, inside `@supports (appearance: base-select)`. See [Theming](theming.html). Lists with `multiple` or `size` never use `base-select`, so these rules do not apply to them.

## A `multiple` select with `size="1"` looks unstyled

Expected. `multiple` with `size="1"` stays native: it gets no styling, not even the 16 px text on touch devices. Use a `size` of 4 or more for lists.

## The selection in a list changes color on focus

Expected. While a list has focus, the browser paints the checked options in its own selection color. The accent bar comes back when focus leaves. Safari always uses its own colors for options. See [How it works](how-it-works.html).

## Dark mode does not switch

Declare it on your page: `:root { color-scheme: light dark; }`. The stylesheet follows your page, not the operating system.

## Firefox looks different

Expected. Firefox draws the open list itself, so it cannot be styled. The closed field matches. See [How it works](how-it-works.html).

## On my phone the list looks native

Expected. On touch devices you get the native picker on purpose. The closed field is styled.

## Long text is cut off without "…"

In Chrome, Edge and Safari 27+, add `<button><selectedcontent></selectedcontent></button>` as the first child of the select. See [Theming](theming.html).

## Empty entries in the list

An option without text, for example only an icon, shows up empty in Firefox and on phones. Give every option visible text.

## Shadow DOM

Styles do not cross a shadow root. Add the stylesheet inside the shadow root, for example with a `<link>` in the component's template.

## Check your page

Paste this into the browser console. It lists selects without the stylesheet, without a label, and options without text, and points out a `multiple` select with `size="1"`. It prints nothing if all is well.

```js
(() => {
  const els = [...document.querySelectorAll('.sqs')];
  if (!els.length) return console.info('[squirrel-select] No element with class="sqs" found.');
  const forced = matchMedia('(forced-colors: active)').matches;
  for (const el of els) {
    if (!(el instanceof HTMLSelectElement)) { console.warn('[squirrel-select] class="sqs" belongs on a <select>:', el); continue; }
    if (el.multiple && el.getAttribute('size') === '1')
      console.info('[squirrel-select] multiple with size="1" stays native, use size="4" or more:', el);
    else if (!forced && !['none', 'base-select'].includes(getComputedStyle(el).appearance))
      console.warn('[squirrel-select] Not styled: stylesheet missing, overridden, or browser too old:', el);
    if (!el.labels.length && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby'))
      console.warn('[squirrel-select] Select has no label:', el);
    for (const o of el.options)
      if (!o.textContent.trim()) console.warn('[squirrel-select] Option without text, shows up empty in Firefox and on phones:', o);
  }
})();
```

Still stuck? [Open an issue](https://github.com/3m5/squirrel-select/issues) with your browser, device and a minimal example.
