# CSS variables

Every CSS variable SquirrelSelect reads, with its default in light and dark mode and where it takes effect. How to set them: [Theming](theming.html).

"Fully styled" means Chrome, Edge and Safari 27+ with a mouse or trackpad. "Field styled" means Firefox, Safari 17.5 to 26, Chrome and Edge 123 to 134, and touch devices, where the open list comes from the system. See [How it works](how-it-works.html).

## Colors

| Variable | Default light / dark | Used for | Fully styled | Field styled |
|---|---|---|---|---|
| `--sqs-text` | `#1c2024` / `#e4e7eb` | text in field and list | yes | yes, also in the Firefox list |
| `--sqs-muted` | `#596370` / `#a3adb8` | placeholder, group labels, hints, disabled | yes | yes |
| `--sqs-bg` | `#fff` / `#1b1f24` | field background | yes | yes |
| `--sqs-surface` | `#fff` / `#252b32` | list background | yes | only the Firefox list |
| `--sqs-border` | `#7d8691` / `#77818c` | border of field and list | yes | yes |
| `--sqs-border-hover` | 45% text mixed into border | border of the field on hover | yes | yes |
| `--sqs-accent` | `#2754c5` / `#8fb1ff` | focus ring, checkmark, border while open | yes | focus ring only |
| `--sqs-invalid` | `#b3261e` / `#ff9b91` | error border | yes | yes |
| `--sqs-arrow` | same as `--sqs-muted` | arrow color | yes | yes |
| `--sqs-hover` | 8% text mixed into surface | hovered and focused option | yes | no |
| `--sqs-selected` | 14% accent mixed into surface | checked option | yes | no |
| `--sqs-mark` | 28% accent, transparent | highlighted matches in the search module, planned for 1.1; no effect in 1.0 | no | no |

`--sqs-hover` and `--sqs-selected` are mixed from your text and accent colors. If you only change `--sqs-accent`, they follow.

## Shape, spacing, type

| Variable | Default | Used for | Fully styled | Field styled |
|---|---|---|---|---|
| `--sqs-font-size` | `1rem` | text size, and with it the overall size; all spacing is in `em` | yes | yes, at least `16px` on touch |
| `--sqs-radius` | `.375rem` | field corners | yes | yes |
| `--sqs-list-radius` | `--sqs-radius`, capped at `.75em` | corners of the open list and of list boxes; the option corners follow | yes | list boxes |
| `--sqs-border-width` | `1px` | border width | yes | yes |
| `--sqs-height` | `2.5em` | minimum field height; never below `24px`, and `44px` on touch | yes | yes |
| `--sqs-padding-block` | `.5em` | padding top and bottom; one value, or two for top and bottom | yes | yes |
| `--sqs-padding-inline` | `.75em` | padding at the start, and the default for `--sqs-arrow-inset`; one value only. The padding at the end is calculated, see [Arrow](theming.html#arrow) | yes | yes |
| `--sqs-gap` | `.5em` | space between text and arrow, checkmark or icon and text | yes | text and arrow |
| `--sqs-option-padding-block` | `.375em` | padding top and bottom of each option; rows stay at least `44px` high on touch | yes | list boxes, not in Safari |
| `--sqs-arrow-size` | `.625em` | arrow width; the height is half, rounded to whole pixels | yes | yes |
| `--sqs-arrow-height` | half of `--sqs-arrow-size` | arrow height, for images that are not twice as wide as high | yes | yes |
| `--sqs-arrow-inset` | `--sqs-padding-inline` | distance between arrow and edge | yes | yes |
| `--sqs-arrow-image` | the chevron | your own arrow, `none` hides it, see [Arrow](theming.html#arrow) | yes | yes |
| `--sqs-arrow-image-open` | `--sqs-arrow-image` | arrow while the list is open | yes | no |

Write lengths with a unit: `0px`, not `0`. Some values have a minimum, such as `24px` for `--sqs-height`, and a bare `0` makes the whole value invalid, so the minimum is lost.

## Focus and open list

| Variable | Default | Used for | Fully styled | Field styled |
|---|---|---|---|---|
| `--sqs-focus-ring` | `2px solid` accent | focus outline (shorthand) | yes | yes |
| `--sqs-focus-offset` | `2px` | focus outline offset | yes | yes |
| `--sqs-shadow` | soft shadow, stronger in dark | list shadow | yes | no |
| `--sqs-list-max-height` | `20em` | maximum list height, also capped to the viewport | yes | no |

If you change colors, check the contrast in light and dark: text at least 4.5:1 on field and list, border and focus ring at least 3:1 against field and page.

## List boxes

List boxes, selects with `multiple` or a `size` greater than 1, read these variables:

- `--sqs-surface` for the background, not `--sqs-bg`
- `--sqs-text`, `--sqs-muted`, `--sqs-border`, `--sqs-border-hover`, `--sqs-border-width`, `--sqs-invalid`
- `--sqs-list-radius` for the corners, by default `--sqs-radius` capped at `.75em`
- `--sqs-accent` for the bar at checked options and for the focus ring
- `--sqs-selected` and `--sqs-hover` for the rows
- `--sqs-option-padding-block` for the row height
- `--sqs-focus-ring`, `--sqs-focus-offset`, `--sqs-font-size`, `--sqs-list-max-height`

The arrow, height, padding and gap variables only apply to the field. Safari ignores colors and padding on options, so `--sqs-selected`, `--sqs-hover` and `--sqs-option-padding-block` have no effect there.
