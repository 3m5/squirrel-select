# Browser support and versioning

Every browser gets a working native select. How far the styling goes depends on the browser and the device.

## Browser support

| Where | What you get |
|---|---|
| Chrome and Edge 135+, Safari 27+ on desktop, with mouse or trackpad | **Fully styled:** closed field and open list |
| Firefox, Safari 17.5 to 26, Chrome and Edge 123 to 134 on desktop | **Field styled.** The open list comes from the browser or operating system |
| Touch devices (phones, tablets without mouse or trackpad) | **Native picker:** field styled, at least 16px text and 44px high. Choosing opens the iOS or Android picker, on purpose |
| List boxes (`multiple`, `size` greater than 1), every browser above | **List box styled:** box, rows and checked options; in Safari the box and group labels. Choosing and focus stay the browser's |
| Older browsers (Chrome before 123, Firefox before 120, Safari before 17.5) | The browser's default select, fully usable |

Use a `size` of 4 or more for list boxes. `multiple` with `size="1"` stays native: it gets no styling, not even the 16px text on touch devices.

The paths come from feature detection, not from a list of versions. When a browser gains a feature, it moves up by itself. When Firefox turns on `appearance: base-select`, you get the full styling without an update.

With forced colors, such as Windows contrast themes, every browser shows the native select in system colors.

## File size

The stylesheet is 2,630 bytes with gzip and 2,349 bytes with Brotli (version 1.0.0, measured on November 22, 2026, with `npm run size`). A size budget in our test run fails any change that makes it larger than 2,650 bytes with gzip. There is no JavaScript file.

## How we test

- **Automated, on every change:** the current stable Chromium, WebKit and Firefox, including touch emulation, screenshots of every state, and automated accessibility checks with axe.
- **Preview, every week:** Firefox with `base-select` switched on, so we see how the full styling will look there. The same run warns us as soon as Firefox Nightly turns it on.
- **By hand, before every minor release:** a short checklist on a real Android device with TalkBack, and keyboard only with zoom at 200% and 400% in Chrome, Edge and Firefox. iPhone is not tested on a real device; the automated tests run the Safari engine with touch emulation. Patch releases get a short smoke test.

We do not test older browser versions one by one. WebKit in our test runs is a Linux build, not Safari, which is why a real Android device is part of every minor release. iPhone is not tested on a real device.

Accessibility is a self-assessment against WCAG 2.2 level AA, not an external certification. The results are on the [accessibility page](../accessibility.html).

## Versioning

We follow semantic versioning. The public API is:

- the class `sqs`, the classes `sqs-icon` and `sqs-hint` for icons and hints in options, and the class `sqs-arrow-start`,
- every CSS variable listed in [CSS variables](variables.html),
- the cascade layer name `squirrel`,
- the file path `@3m5-de/squirrel-select/squirrel-select.css`.

Removing or renaming any of these, or dropping one of the paths above, needs a new major version.

Intended visual changes, for example to default colors or spacing, ship in minor releases and are always listed under **Visual changes** in the [release notes](https://github.com/3m5/squirrel-select/releases). Fixes for browser updates ship as patches. If your project has a signed-off design, pin the minor version, for example `~1.2.0`.

Only the latest 1.x release gets fixes. Version 0.x is no longer maintained, see [Migrating from 0.x](migrating.html).

## Sources

Checked on November 22, 2026. Version numbers come from MDN's browser compatibility data.

- **Chrome and Edge 135:** [The `<select>` element can now be customized with CSS](https://developer.chrome.com/blog/a-customizable-select), Chrome for Developers
- **Safari 27:** [Safari 27 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes) and [The golden rule of Customizable Select](https://webkit.org/blog/18117/the-golden-rule-of-customizable-select/), WebKit
- **Firefox:** in development behind a preference, tracked in [bug 1944403](https://bugzilla.mozilla.org/show_bug.cgi?id=1944403). Mozilla's [standards position](https://github.com/mozilla/standards-positions/issues/1060) is positive.
- **The styled field** needs the CSS function [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark): Chrome and Edge 123, Firefox 120, Safari 17.5. **The styled open list** needs [`appearance: base-select`](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select), MDN.
- **Why phones keep the native picker:** with [`appearance: base-select`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/appearance), the select opens a web menu instead of the operating system's picker, MDN.
- **Touch targets:** [WCAG 2.2, 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Apple Human Interface Guidelines, Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
