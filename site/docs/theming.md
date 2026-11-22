# Theming

Change the look with CSS variables, or write your own rules. Both work without `!important`, because the whole stylesheet lives in the cascade layer `squirrel`.

## Where to set variables

Set them on the select, or on any ancestor. The stylesheet only reads them and never declares them, so a value on a parent always arrives.

```css
.filters { --sqs-accent: light-dark(#b0185a, #ff8cc6); --sqs-radius: 999px; }
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

"Full" means Chrome, Edge and Safari 27+ with a mouse or trackpad. "Field only" means Firefox, older browsers and touch devices, where the open list comes from the system. See [How it works](how-it-works.html). Lists with `multiple` or `size` use fewer variables, see Lists below.

### Colors

| Variable | Default light / dark | Used for | Full | Field only |
|---|---|---|---|---|
| `--sqs-text` | `#1c2024` / `#e4e7eb` | text in field and list | yes | yes, also in the Firefox list |
| `--sqs-muted` | `#596370` / `#a3adb8` | placeholder, group labels, hints, disabled | yes | yes |
| `--sqs-bg` | `#fff` / `#1b1f24` | field background | yes | yes |
| `--sqs-surface` | `#fff` / `#252b32` | list background | yes | only the Firefox list |
| `--sqs-border` | `#7d8691` / `#77818c` | border of field and list | yes | yes |
| `--sqs-border-hover` | 45 % text mixed into border | border of the field on hover | yes | yes |
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
| `--sqs-radius` | `.375rem` | field corners | yes | yes |
| `--sqs-list-radius` | `--sqs-radius`, capped at `.75em` | corners of the open list and of lists; the option corners follow | yes | lists |
| `--sqs-border-width` | `1px` | border width | yes | yes |
| `--sqs-height` | `2.5em` | minimum field height; never below 24 px, and 44 px on touch | yes | yes |
| `--sqs-padding-block` | `.5em` | padding top and bottom; one value, or two for top and bottom | yes | yes |
| `--sqs-padding-inline` | `.75em` | padding start and end; one value only, because the arrow position is calculated from it | yes | yes |
| `--sqs-gap` | `.5em` | space between text and arrow, checkmark or icon and text | yes | text and arrow |
| `--sqs-option-padding-block` | `.375em` | padding top and bottom of each option; rows stay at least 44 px high on touch | yes | lists, not in Safari |
| `--sqs-arrow-size` | `.625em` | arrow width; the height is half, rounded to whole pixels | yes | yes |
| `--sqs-arrow-height` | half of `--sqs-arrow-size` | arrow height, for images that are not twice as wide as high | yes | yes |
| `--sqs-arrow-inset` | `--sqs-padding-inline` | distance between arrow and edge | yes | yes |
| `--sqs-arrow-image` | the chevron | your own arrow, `none` hides it, see Arrow below | yes | yes |
| `--sqs-arrow-image-open` | `--sqs-arrow-image` | arrow while the list is open | yes | no |

Write lengths with a unit: `0px`, not `0`. Some values have a minimum, such as 24 px for `--sqs-height`, and a bare `0` makes the whole value invalid, so the minimum is lost.

### Focus and list

| Variable | Default | Used for | Full | Field only |
|---|---|---|---|---|
| `--sqs-focus-ring` | `2px solid` accent | focus outline (shorthand) | yes | yes |
| `--sqs-focus-offset` | `2px` | focus outline offset | yes | yes |
| `--sqs-shadow` | soft shadow, stronger in dark | list shadow | yes | no |
| `--sqs-list-max-height` | `20em` | maximum list height, also capped to the viewport | yes | no |

If you change colors, check the contrast in light and dark: text at least 4.5:1 on field and list, border and focus ring at least 3:1 against field and page.

## Sizes

There are no size classes. Change `--sqs-font-size`, and height, spacing and arrow scale with it. Three steps that work well:

| Step | `--sqs-font-size` | Text with a 16 px root |
|---|---|---|
| Small | `.875rem` | 14 px |
| Medium | `1rem`, the default | 16 px |
| Large | `1.125rem` | 18 px |

Set the value where the step applies, for example on a toolbar:

```css
.toolbar { --sqs-font-size: .875rem; }
```

On touch devices the text never gets smaller than 16 px and the field never lower than 44 px. In lists, each row is at least 44 px high in Chrome and Firefox. Below 16 px, iOS zooms into the page when the field gets focus.

## Lists

Lists with `multiple` or `size` greater than 1 read these variables. `multiple` with `size="1"` stays native: it gets no styling, not even the 16 px text on touch devices.

The variables:

- `--sqs-surface` for the background, not `--sqs-bg`
- `--sqs-text`, `--sqs-muted`, `--sqs-border`, `--sqs-border-hover`, `--sqs-border-width`, `--sqs-invalid`
- `--sqs-list-radius` for the corners, by default `--sqs-radius` capped at `.75em`
- `--sqs-accent` for the bar at checked options and for the focus ring
- `--sqs-selected` and `--sqs-hover` for the rows
- `--sqs-option-padding-block` for the row height
- `--sqs-focus-ring`, `--sqs-focus-offset`, `--sqs-font-size`, `--sqs-list-max-height`

The arrow, height, padding and gap variables only apply to the field. Safari ignores colors and padding on options, so `--sqs-selected`, `--sqs-hover` and `--sqs-option-padding-block` have no effect there. See [How it works](how-it-works.html).

## Your own rules

Any rule outside a cascade layer beats the stylesheet, whatever its specificity:

```css
.sqs { font-weight: 600; }
```

Keep two things: the focus outline, and the native look in forced colors. Do not remove `outline` on focus, and do not set `forced-color-adjust: none` on the select.

Rules for the open list only work with `base-select`. Wrap them in `@supports` and never put them in a selector list with other selectors. Firefox does not know `::picker(select)` and would drop the whole rule. Lists never use `base-select`, so these rules do not reach them.

```css
@supports (appearance: base-select) {
  .sqs::picker(select) { border-width: 2px; }
  .sqs option { padding: .5em .75em; }
}
```

## Arrow

The arrow is drawn with CSS gradients, so it follows `--sqs-arrow` and dark mode. In forced colors the native arrow takes over, always at the end.

**Size.** `--sqs-arrow-size` sets the width; the height is half of it. Between `.5em` and `1em` works best. The padding next to the arrow grows with it. `--sqs-arrow-inset` sets the distance from the edge, by default the same as `--sqs-padding-inline`.

**Side.** The arrow belongs at the end of the field, which is on the left under `dir="rtl"`. For special cases, such as a compact "Sort" select in a toolbar, the class `sqs-arrow-start` moves it to the start:

```html
<select class="sqs sqs-arrow-start">…</select>
```

**Your own arrow.** One variable replaces the chevron:

```css
.sqs { --sqs-arrow-image: url("arrow.svg"); }
```

- The image fills a box as wide as `--sqs-arrow-size` and half as high, or as high as `--sqs-arrow-height`. An SVG with a `viewBox` fits itself in. For icons from an icon set, crop the `viewBox` to the arrow.
- An image file keeps its own colors. It does not follow `--sqs-arrow` or dark mode, so check its contrast against the field in both: at least 3:1.
- `none` hides the arrow. An invalid value, such as a color, shows no arrow either.

To follow `--sqs-arrow` and dark mode, draw the arrow with gradients instead and take the color from `var(--sqs-arrow, light-dark(#596370, #a3adb8))`. The value is resolved where you set `--sqs-arrow-image`, so set it on the select or on the same element as `--sqs-arrow`.

A filled triangle:

```css
.sqs {
  --sqs-arrow-size: .5em;
  --sqs-arrow-image: conic-gradient(from -45deg at 50% 100%, var(--sqs-arrow, light-dark(#596370, #a3adb8)) 90deg, #0000 0);
}
```

Two chevrons, up and down. They need two positions, so this one also sets `background-position`, and it keeps the arrow at the end:

```css
.sqs {
  --sqs-arrow-size: .5em;
  --sqs-arrow-image:
    linear-gradient(135deg, #0000 calc(100% / 3 - .8px), var(--sqs-arrow, light-dark(#596370, #a3adb8)) 0 calc(100% / 3 + .8px), #0000 0),
    linear-gradient(-135deg, #0000 calc(100% / 3 - .8px), var(--sqs-arrow, light-dark(#596370, #a3adb8)) 0 calc(100% / 3 + .8px), #0000 0),
    linear-gradient(45deg, #0000 calc(100% / 3 - .8px), var(--sqs-arrow, light-dark(#596370, #a3adb8)) 0 calc(100% / 3 + .8px), #0000 0),
    linear-gradient(-45deg, #0000 calc(100% / 3 - .8px), var(--sqs-arrow, light-dark(#596370, #a3adb8)) 0 calc(100% / 3 + .8px), #0000 0);
  background-position:
    right var(--sqs-padding-inline, .75em) top calc(50% - .21875em), right var(--sqs-padding-inline, .75em) top calc(50% - .21875em),
    right var(--sqs-padding-inline, .75em) top calc(50% + .21875em), right var(--sqs-padding-inline, .75em) top calc(50% + .21875em);
}
.sqs:dir(rtl) {
  background-position:
    left var(--sqs-padding-inline, .75em) top calc(50% - .21875em), left var(--sqs-padding-inline, .75em) top calc(50% - .21875em),
    left var(--sqs-padding-inline, .75em) top calc(50% + .21875em), left var(--sqs-padding-inline, .75em) top calc(50% + .21875em);
}
```

**Another arrow while open.** `--sqs-arrow-image-open` takes the same values, here a chevron pointing up. This needs `base-select`, so Firefox, touch devices and older browsers keep the closed arrow:

```css
.sqs {
  --sqs-arrow-image-open:
    linear-gradient(135deg, #0000 calc(100% / 3 - .8px), var(--sqs-arrow, light-dark(#596370, #a3adb8)) 0 calc(100% / 3 + .8px), #0000 0),
    linear-gradient(-135deg, #0000 calc(100% / 3 - .8px), var(--sqs-arrow, light-dark(#596370, #a3adb8)) 0 calc(100% / 3 + .8px), #0000 0);
}
```

**A tall arrow.** For an image that is not twice as wide as high, such as 9 × 25 px, set both sides:

```css
.sqs {
  --sqs-arrow-size: 9px;
  --sqs-arrow-height: 25px;
  --sqs-arrow-image: url("arrow-tall.svg");
}
```

The width is rounded to an even number of pixels, here 10 px; an SVG with a `viewBox` stays centered in it. Keep the image lower than the field. The chevron and the recipes above are drawn for a box twice as wide as high and get distorted with another height.

## More recipes

Each of these is your own rule outside a layer, so it wins without `!important`. `:not([multiple], [size])` limits a rule to the closed field and leaves lists alone.

**Only a line below the field.**

```css
.sqs:not([multiple], [size]) {
  border-width: 0 0 var(--sqs-border-width, 1px);
  border-radius: 0;
}
.sqs:not([multiple], [size]):is(:user-invalid, [aria-invalid="true"]) {
  box-shadow: inset 0 -1px var(--sqs-invalid, light-dark(#b3261e, #ff9b91));
}
```

An error shows in a second way besides the color: the stylesheet adds an inner line of 1px. Without the second rule that line runs all around the field; with it, the bottom line gets twice as thick. In forced colors the line turns dashed instead. The open list keeps its border. On a colored background, set `--sqs-bg` to the background color too.

**No checkmark and no bold for the checked option.**

```css
.sqs option:checked {
  font-weight: normal;
}
@supports (appearance: base-select) {
  .sqs option::checkmark {
    display: none;
  }
}
```

The checked option keeps its background: `--sqs-selected`, plus the bar in lists, and its own gray in Safari lists. That is then the only cue, so keep it clearly visible.

**Different text in field and list.**

```css
.sqs {
  --sqs-text: light-dark(#000, #fff);
  line-height: 1.5;
}
.sqs:not([multiple], [size], :disabled, :has(option[value=""]:checked)) {
  color: light-dark(#4a525c, #c4cbd3);
}
```

`--sqs-text` colors the list. The field gets its own color only while it shows a real value, so the placeholder and a disabled field keep the muted color. A plain `color` on `.sqs` would override both. The options take over the `line-height`; set it on `.sqs option` to give them their own.

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

Nothing to do. Under `dir="rtl"` the arrow moves to the left automatically, and in lists the bar at checked options moves to the right.
