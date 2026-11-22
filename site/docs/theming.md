# Theming

Change the look with CSS variables, or with your own rules. Both work without `!important`, because the whole stylesheet lives in the cascade layer `squirrel`.

Every variable, with its default and where it takes effect, is listed in [CSS variables](variables.html).

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

## Sizes

There are no size classes. Change `--sqs-font-size`, and height, spacing and arrow scale with it. Three steps that work well:

| Step | `--sqs-font-size` | Text with a 16px root |
|---|---|---|
| Small | `.875rem` | 14px |
| Medium | `1rem`, the default | 16px |
| Large | `1.125rem` | 18px |

Set the value where the step applies, for example on a toolbar:

```css
.toolbar { --sqs-font-size: .875rem; }
```

On touch devices the text never gets smaller than 16px and the field never lower than 44px. In list boxes, each row is at least 44px high in Chrome and Firefox. Below 16px, iOS zooms into the page when the field gets focus.

## List boxes

List boxes read fewer variables, listed in [CSS variables](variables.html#list-boxes). The arrow, height, padding and gap variables only apply to the field. Safari ignores colors and padding on options.

`multiple` with `size="1"` stays native: it gets no styling, not even the 16px text on touch devices.

## Your own rules

Any rule outside a cascade layer beats the stylesheet, whatever its specificity:

```css
.sqs { font-weight: 600; }
```

Keep two things: the focus outline, and the native look in forced colors. Do not remove `outline` on focus, and do not set `forced-color-adjust: none` on the select.

Rules for the open list only work with `base-select`. Wrap them in `@supports` and never put them in a selector list with other selectors. Firefox does not know `::picker(select)` and would drop the whole rule. List boxes never use `base-select`, so these rules do not reach them.

```css
@supports (appearance: base-select) {
  .sqs::picker(select) { border-width: 2px; }
  .sqs option { padding: .5em .75em; }
}
```

While the list is open, the border takes `--sqs-accent`. To keep the normal border color, set it for `:open` in a rule of its own inside the same block:

```css
@supports (appearance: base-select) {
  .sqs:open { border-color: var(--sqs-border, light-dark(#7d8691, #77818c)); }
}
```

## Arrow

The arrow is drawn with CSS gradients, so it follows `--sqs-arrow` and dark mode. In forced colors the native arrow takes over, always at the end.

**Size.** `--sqs-arrow-size` sets the width; the height is half of it. Between `.5em` and `1em` works best. `--sqs-arrow-inset` sets the distance from the edge, by default the same as `--sqs-padding-inline`.

**Space at the end.** The field keeps room for the arrow, so long text is cut off before it and never runs under it. The padding at the end is the sum of three values:

```text
padding at the end = --sqs-arrow-inset + arrow width + --sqs-gap
```

With the defaults that is `.75em + .625em + .5em`, 30px at a font size of 16px. A larger arrow or inset makes it grow. The arrow width is rounded to an even number of pixels, so a `9px` arrow takes up 10px.

`--sqs-padding-inline` only sets the start. To match an exact padding at the end, for example from an existing design, change `--sqs-gap`. For 40px with a 17px inset and a 10px arrow:

```css
.sqs {
  --sqs-arrow-inset: 17px;
  --sqs-arrow-size: 10px;
  --sqs-gap: 13px; /* 17px + 10px + 13px = 40px */
}
```

`--sqs-gap` is also the space between checkmark or icon and text in the open list. With `sqs-arrow-start`, the same sum applies at the start and `--sqs-padding-inline` sets the end.

**Side.** The arrow belongs at the end of the field, which is on the left under `dir="rtl"`. For special cases, such as a compact "Sort" select in a toolbar, the class `sqs-arrow-start` moves it to the start:

```html
<select class="sqs sqs-arrow-start">…</select>
```

**Vertical position.** The arrow sits in the middle of the field. To move it, set `background-position-y`, for example 13px above the bottom edge:

```css
.sqs { background-position-y: bottom 13px; }
```

Right to left and `sqs-arrow-start` keep working, because they only change the horizontal position.

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
    right var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% - .21875em), right var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% - .21875em),
    right var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% + .21875em), right var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% + .21875em);
}
.sqs:dir(rtl) {
  background-position:
    left var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% - .21875em), left var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% - .21875em),
    left var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% + .21875em), left var(--sqs-arrow-inset, var(--sqs-padding-inline, .75em)) top calc(50% + .21875em);
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

**A tall arrow.** For an image that is not twice as wide as high, such as 9px × 25px, set both sides:

```css
.sqs {
  --sqs-arrow-size: 9px;
  --sqs-arrow-height: 25px;
  --sqs-arrow-image: url("arrow-tall.svg");
}
```

The width is rounded to an even number of pixels, here 10px; an SVG with a `viewBox` stays centered in it. Keep the image lower than the field. The chevron and the recipes above are drawn for a box twice as wide as high and get distorted with another height.

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

The checked option keeps its background: `--sqs-selected`, plus the bar in list boxes, and its own gray in Safari list boxes. That is then the only cue, so keep it clearly visible.

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

For icons and hints in options, see [Icons and hints in options](icons-and-hints.html).

## Right to left

Nothing to do. Under `dir="rtl"` the arrow moves to the left automatically, and in list boxes the bar at checked options moves to the right.
