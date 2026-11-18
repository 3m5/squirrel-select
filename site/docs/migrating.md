# Migrating from 0.x to 1.0

Version 1.0 removes the JavaScript dropdown. You keep your `<select>`, add the class `sqs` and one stylesheet, and delete the old init call and the CSS you wrote for the old dropdown.

## Why this is a breaking change

0.x hid your `<select>` and drew a dropdown from `<div>`s next to it. 1.0 styles the real `<select>` instead. The `<div>`s, their class names and the JavaScript that built them are gone. There is no compatibility mode, because keeping the old class names would mean keeping the copy of the select we just removed.

One honest note: in every published 0.x release, the bundled stylesheet never matched the markup, because the class names were hashed at build time. If 0.x looked right in your project, that is because **you** styled it. That CSS is what you migrate.

Nothing changes until you upgrade on purpose: `^0.1.5` in your `package.json` does not pull in 1.0.

## Checklist

1. **Remove the JavaScript.**

   ```diff
   - import SquirrelSelect from '@3m5-de/squirrel-select'
   - SquirrelSelect()
   ```

   A leftover import fails loudly at build time ("not exported"), because 1.0 has no JavaScript entry point.

2. **Add the stylesheet** once, globally:

   ```js
   import '@3m5-de/squirrel-select/squirrel-select.css'
   ```

   Or use the `<link>` from the [Quickstart](quickstart.html).

3. **Rename the class on every select.**

   ```diff
   - <select class="sqs-dropdown-select" name="country">
   + <select class="sqs" name="country">
   ```

4. **Delete your CSS for the old dropdown.** Move what you still want to variables or to plain rules on `.sqs`, see the tables below.

5. **Remove the workarounds 0.x needed.**
   - `dispatchEvent(new Event('sqsUpdate'))` or `new Event('change')` after setting a value in code: not needed. The browser shows the value itself.
   - CSS or JavaScript that targets `[data-sqs-initialized]` or the `hidden` class 0.x added.
   - `data-sqs-wrapper-classes`, `data-sqs-select-classes`, `data-sqs-select-trigger-classes`, `data-sqs-select-options-classes`: delete them. Put your classes on the `<select>` or a parent.

6. **Update end-to-end tests.** Tests that clicked `.select__trigger` and `.select__option` now use the native select, for example `page.selectOption('select[name=country]', 'de')` in Playwright.

7. **Tell your designers what looks different** (last section).

## Old class to new selector

| 0.x | 1.0 | Note |
|---|---|---|
| `select.sqs-dropdown-select` | `select.sqs` | |
| `.sqs-dropdown__wrapper` | none | No wrapper. Use a parent of your own. |
| `.select`, `.select__trigger` | `.sqs` | The closed select is the trigger. |
| `.select__options` | `.sqs::picker(select)` | Only with `appearance: base-select`. Never in a selector list, see [Theming](theming.html). |
| `.select__option` | `.sqs option` | |
| `.select__option.selected` | `.sqs option:checked` | |
| `.select__option:hover`, `:focus` | `.sqs option:hover`, `.sqs option:focus-visible` | |
| `.select.open` | `.sqs:open` | Only with `appearance: base-select`. |
| `.select__disabled` | `.sqs:disabled` | |
| `.different-from-default-option` | `.sqs:has(option:checked:not([value=""]))` | Pure CSS, no class needed. |

## Old variable to new variable

The 0.x variables never took effect, but if you copied them into your own CSS:

| 0.x | 1.0 |
|---|---|
| `--sqs-dropdown-bg` | `--sqs-bg` (field) or `--sqs-surface` (list) |
| `--sqs-dropdown-text-color` | `--sqs-text` |
| `--sqs-dropdown-border-color` | `--sqs-border` |
| `--sqs-dropdown-font-size` | `--sqs-font-size`, which also sets the overall size |
| `--sqs-dropdown-highlight-color` | `--sqs-hover` for the list; `--sqs-accent` for focus and checkmark |
| `--sqs-dropdown-options-max-height` | `--sqs-list-max-height` |
| `--sqs-dropdown-trigger-height` | none: the height follows `--sqs-font-size` and `--sqs-padding-block` |
| `--sqs-dropdown-option-padding` | none: write `.sqs option { padding: … }`, which takes effect with `base-select` only |
| `--sqs-dropdown-icon-path`, `--sqs-dropdown-icon-open-path` | none: the color is `--sqs-arrow`, for another shape see [Custom arrow](theming.html) |

## What looks and behaves different

- **Firefox on desktop:** the closed field matches your design. The open list comes from the browser. 0.x drew its own list everywhere.
- **Touch devices:** the closed field matches your design. Choosing opens the native iOS or Android picker. 0.x showed its own list.
- **Keyboard:** now the browser's own behavior. Type-to-select works with any letter, including umlauts and accents. 0.x only matched a to z.
- **Screen readers:** the select is announced as a real select with all its options. 0.x had no ARIA roles.
- **Search:** 0.x had none beyond type-to-select, and neither does the 1.0 core. An optional search module is planned for 1.1.
