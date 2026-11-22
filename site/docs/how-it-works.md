# How it works

SquirrelSelect styles the native `<select>`. The field follows your CSS variables everywhere; the open list only where the browser allows it.

## Three paths

| Where | Closed field | Open list |
|---|---|---|
| Chrome and Edge 135+, Safari 27+ on desktop, with mouse or trackpad | styled | styled: groups, checkmark, separators, dark mode |
| Firefox, Safari 17.5 to 26, Chrome and Edge 123 to 134 on desktop | styled | drawn by the browser or operating system |
| Touch devices (phones, tablets without mouse or trackpad) | styled, at least 16px text and 44px high | the native iOS or Android picker |

The first path uses `appearance: base-select`, the browser feature that makes the native select fully stylable. We switch it on only for a mouse or trackpad. On touch devices it can replace the native picker with a web menu, and the native picker is the better choice there. All other browsers get `appearance: none`: the field matches your design, the list is the system's.

There is no JavaScript copy of the list for Firefox. The open native list is drawn outside the page, so no CSS or script can reach it. Faking it would mean rebuilding the select from `<div>`s, with all the keyboard and screen reader work that comes with it. The goal is **the same variables, not the same pixels**.

These three paths are for the field and its open list. List boxes work differently, see below.

## List boxes

A select with `multiple`, or with `size` greater than 1, is a list box in the page instead of a field that opens. SquirrelSelect styles it in every browser and never switches it to `base-select`, because in Chrome that would change how it works: a click would toggle instead of choose, Shift would no longer select a range, and focus could get lost. Choosing with mouse, keyboard and touch stays exactly as the browser does it.

| Part | Chrome, Edge, Firefox | Safari |
|---|---|---|
| Box: background, border, corners, focus ring, error border | styled | styled |
| Rows: spacing, rounded corners, hover | styled | from the browser |
| Checked options | tinted, with an accent bar at the start | system color |
| Option groups | smaller, muted labels | smaller, muted labels |

While the list has focus, the browser paints the checked options in its own selection color, so focus and selection look the way people know them. The accent bar comes back when focus leaves. Under `dir="rtl"` the bar sits on the right. In forced colors, checked options use the system's selection colors.

`size` sets the number of visible rows, and `--sqs-list-max-height` caps the height. On touch devices, rows are at least 44px high in Chrome and Firefox. An iPhone shows a `multiple` select as a field that opens the native picker; we have not tested this on a real device. Use a `size` of 4 or more for lists. `multiple` with `size="1"` stays native: it gets no styling, not even the 16px text on touch devices. Chrome draws it as a closed field, Firefox and Safari as a list one row high, and no single design fits both.

## What it looks like

These are the reference screenshots from our automated tests. They are taken with Playwright on Linux, so WebKit stands in for Safari and the touch images are emulated. Long screenshots show their top part; the link below each one opens it in full.

<figure class="ci-shot">
<img loading="lazy" decoding="async" src="../assets/ci/open-light-chromium-linux.png" width="1024" height="768" alt="Chrome, open list with two groups, a checked option with checkmark, a disabled option and a separator">
<figcaption><strong>Chrome, desktop.</strong> Field and list are styled. <a href="../assets/ci/open-light-chromium-linux.png">Full Chrome screenshot</a></figcaption>
</figure>

<figure class="ci-shot">
<img loading="lazy" decoding="async" src="../assets/ci/open-light-webkit-linux.png" width="1024" height="768" alt="WebKit, the same open list with slightly different spacing and group labels">
<figcaption><strong>WebKit, desktop.</strong> The same list. Each engine keeps a few defaults of its own, such as the size of group labels. <a href="../assets/ci/open-light-webkit-linux.png">Full WebKit screenshot</a></figcaption>
</figure>

<figure class="ci-shot ci-tall">
<img loading="lazy" decoding="async" src="../assets/ci/closed-light-firefox-linux.png" width="1024" height="1531" alt="Firefox, all fields closed and styled like in Chrome">
<figcaption><strong>Firefox, desktop.</strong> Every closed field is styled. The open list is drawn by Firefox, so it cannot be captured. Firefox takes over our text and background colors. <a href="../assets/ci/closed-light-firefox-linux.png">Full Firefox screenshot</a></figcaption>
</figure>

<figure class="ci-shot ci-tall">
<img loading="lazy" decoding="async" src="../assets/ci/touch-webkit-touch-linux.png" width="390" height="3466" alt="Touch emulation in WebKit, a narrow page with all fields closed and styled">
<figcaption><strong>Touch.</strong> Fields are styled and at least 44px high. Tapping opens the native picker. <a href="../assets/ci/touch-webkit-touch-linux.png">Full touch screenshot</a></figcaption>
</figure>

<figure class="ci-shot ci-tall">
<img loading="lazy" decoding="async" src="../assets/ci/forced-colors-chromium-linux.png" width="1024" height="1539" alt="Forced colors in Chrome, every field drawn in system colors, the invalid field with a dashed border">
<figcaption><strong>Forced colors</strong>, such as Windows contrast themes. We step back to the native select, so arrow, checkmark and focus ring keep the system colors. An invalid field gets a dashed border, so the error does not rely on color. <a href="../assets/ci/forced-colors-chromium-linux.png">Full forced colors screenshot</a></figcaption>
</figure>

## Icons and hints

Options can show icons and hints where the open list is fully styled. See [Icons and hints in options](icons-and-hints.html).

## Older browsers

Browsers without `light-dark()` (Chrome before 123, Firefox before 120, Safari before 17.5) get the browser's default select. It looks plain and works fully.

See [Browser support](browser-support.html) for how we test.
