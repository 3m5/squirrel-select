# Theming

Change the look with CSS variables, or write your own rules. Both work without `!important`, because the whole stylesheet lives in the cascade layer `squirrel`.

## Where to set variables

Set them on the select, or on any ancestor. The stylesheet only reads them and never declares them, so a value on a parent always arrives.

```css
.filters { --sqs-accent: #b0185a; --sqs-radius: 999px; }
```

```html
<select class="sqs" style="--sqs-font-size: .875rem">…</select>
```

For dark mode, give both values with `light-dark()` and declare `color-scheme` on your page:

```css
:root { color-scheme: light dark; }
.filters { --sqs-accent: light-dark(#a3165a, #ff8cc6); }
```

Without `color-scheme`, the select stays light, even if the operating system is dark.

## Variables

"Full" means Chrome, Edge and Safari 27+ with a mouse or trackpad. "Field only" means Firefox, older browsers and touch devices, where the open list comes from the system. See [How it works](how-it-works.html).

### Colors

| Variable | Default light / dark | Used for | Full | Field only |
|---|---|---|---|---|
| `--sqs-text` | `#1c2024` / `#e4e7eb` | text in field and list | yes | yes, also in the Firefox list |
| `--sqs-muted` | `#596370` / `#a3adb8` | placeholder, group labels, hints, disabled | yes | yes |
| `--sqs-bg` | `#fff` / `#1b1f24` | field background | yes | yes |
| `--sqs-surface` | `#fff` / `#252b32` | list background | yes | only the Firefox list |
| `--sqs-border` | `#7d8691` / `#77818c` | border of field and list | yes | yes |
| `--sqs-accent` | `#2754c5` / `#8fb1ff` | focus ring, checkmark, border while open | yes | focus ring only |
| `--sqs-invalid` | `#b3261e` / `#ff9b91` | error border | yes | yes |
| `--sqs-arrow` | same as `--sqs-muted` | arrow color | yes | yes |
| `--sqs-hover` | 8 % text mixed into surface | hovered and focused option | yes | no |
| `--sqs-selected` | 14 % accent mixed into surface | checked option | yes | no |
| `--sqs-mark` | 28 % accent, transparent | highlighted matches in the search module, planned for 1.1; no effect in 1.0 | no | no |

`--sqs-hover` and `--sqs-selected` are mixed from your text and accent colors. If you only change `--sqs-accent`, they follow.

### Shape, spacing, type

| Variable | Default | Used for | Full | Field only |
|---|---|---|---|---|
| `--sqs-font-size` | `1rem` | text size, and with it the overall size; all spacing is in `em` | yes | yes, at least 16 px on touch |
| `--sqs-radius` | `.375rem` | field corners; the list is capped at `.75em` | yes | field |
| `--sqs-border-width` | `1px` | border width | yes | yes |
| `--sqs-padding-block` | `.5em` | padding top and bottom | yes | yes |
| `--sqs-padding-inline` | `.75em` | padding start and end | yes | yes |
| `--sqs-gap` | `.5em` | space between text and arrow, checkmark or icon and text | yes | text and arrow |

### Focus and list

| Variable | Default | Used for | Full | Field only |
|---|---|---|---|---|
| `--sqs-focus-ring` | `2px solid` accent | focus outline (shorthand) | yes | yes |
| `--sqs-focus-offset` | `2px` | focus outline offset | yes | yes |
| `--sqs-shadow` | soft shadow, stronger in dark | list shadow | yes | no |
| `--sqs-list-max-height` | `20em` | maximum list height, also capped to the viewport | yes | no |

If you change colors, check the contrast in light and dark: text at least 4.5:1 on field and list, border and focus ring at least 3:1 against field and page.

## Sizes

There are no size classes. Change `--sqs-font-size`, everything else scales:

```css
.compact { --sqs-font-size: .875rem; }
.large   { --sqs-font-size: 1.125rem; }
```

On touch devices the text never gets smaller than 16 px and the field never lower than 44 px. Below 16 px, iOS zooms into the page when the field gets focus.

## Your own rules

Any rule outside a cascade layer beats the stylesheet, whatever its specificity:

```css
.sqs { font-weight: 600; }
```

Keep two things: the focus outline, and the native look in forced colors. Do not remove `outline` on focus, and do not set `forced-color-adjust: none` on the select.

Rules for the open list only work with `base-select`. Wrap them in `@supports` and never put them in a selector list with other selectors. Firefox does not know `::picker(select)` and would drop the whole rule.

```css
@supports (appearance: base-select) {
  .sqs::picker(select) { border-width: 2px; }
  .sqs option { padding: .5em .75em; }
}
```

## Custom arrow

The arrow is drawn with two CSS gradients, so it follows `--sqs-arrow` and dark mode. In forced colors the native arrow takes over. To use an image instead, replace the background:

```css
.sqs {
  background-image: url("arrow.svg");
  background-size: .75em;
  background-position: right .75em center;
}
.sqs:dir(rtl) { background-position: left .75em center; }
@media (forced-colors: active) {
  .sqs { background-image: none; }
}
```

An image file does not follow `--sqs-arrow` or dark mode. Make sure it has enough contrast in both, and remove it in forced colors: there the native arrow comes back, and without the last rule the field shows two arrows.

## Long text

Long option text ends with "…" in the closed field. In Chrome and Edge with `base-select` this needs `<selectedcontent>`, otherwise the text is cut off without an ellipsis. Safari adds the ellipsis even without it. Put it first inside the select:

```html
<select class="sqs">
  <button><selectedcontent></selectedcontent></button>
  <option>A very long option text …</option>
</select>
```

For icons and hints in options, see [rich content](how-it-works.html).

## Right to left

Nothing to do. Under `dir="rtl"` the arrow moves to the left automatically.
