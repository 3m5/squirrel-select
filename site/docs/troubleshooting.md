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

## Bootstrap and other frameworks

Do not combine `.sqs` with `.form-select` or similar classes. Their CSS is not in a layer and wins.

## The open list ignores my rule

Rules with `::picker(select)`, `::checkmark` or `:open` must not share a selector list with other selectors. Firefox does not know them and drops the whole rule, including the parts it knows. Write them on their own, inside `@supports (appearance: base-select)`. See [Theming](theming.html).

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

Paste this into the browser console. It lists selects without the stylesheet, without a label, and options without text. It prints nothing if all is well.

```js
(() => {
  const els = [...document.querySelectorAll('.sqs')];
  if (!els.length) return console.info('[squirrel-select] No element with class="sqs" found.');
  const forced = matchMedia('(forced-colors: active)').matches;
  for (const el of els) {
    if (!(el instanceof HTMLSelectElement)) { console.warn('[squirrel-select] class="sqs" belongs on a <select>:', el); continue; }
    if (!forced && !['none', 'base-select'].includes(getComputedStyle(el).appearance))
      console.warn('[squirrel-select] Not styled: stylesheet missing, overridden, or browser too old:', el);
    if (!el.labels.length && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby'))
      console.warn('[squirrel-select] Select has no label:', el);
    for (const o of el.options)
      if (!o.textContent.trim()) console.warn('[squirrel-select] Option without text, shows up empty in Firefox and on phones:', o);
  }
})();
```

Still stuck? [Open an issue](https://github.com/3m5/squirrel-select/issues) with your browser, device and a minimal example.
