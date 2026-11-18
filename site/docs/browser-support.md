# Browser support and versioning

Every browser gets a working, native select. We never break it. How far the styling goes depends on the browser and the device.

## Browser support

| Where | What you get |
|---|---|
| Chrome and Edge 135+, Safari 27+ on desktop, with mouse or trackpad | **Fully styled:** closed field and open list |
| Firefox, Safari 17.5 to 26, Chrome and Edge 123 to 134 on desktop | **Field styled.** The open list comes from the browser or operating system |
| Phones and tablets | **Field styled**, at least 16 px text and 44 px high. Choosing opens the native iOS or Android picker, on purpose |
| Older browsers (Chrome before 123, Firefox before 120, Safari before 17.5) | The browser's default select, fully usable |

The paths come from feature detection, not from a list of versions. When a browser gains a feature, it moves up by itself. When Firefox turns on `appearance: base-select`, you get the full styling without an update.

With forced colors, such as Windows contrast themes, every browser shows the native select in system colors.

## How we test

- **Automated, on every change:** the current stable Chromium, WebKit and Firefox, including touch emulation, screenshots of every state, and automated accessibility checks with axe.
- **Preview, every week:** Firefox with `base-select` switched on, so we see how the full styling will look there. The same run warns us as soon as Firefox Nightly turns it on.
- **By hand, before every minor release:** a short checklist on our team's phones (iPhone and Android), with the free screen readers on those phones, and keyboard only with zoom at 200% and 400% in Chrome, Edge and Firefox. Patch releases get a short smoke test.

We do not test older browser versions one by one. WebKit in our test runs is a Linux build, not Safari, which is why real phones are part of every minor release.

Accessibility is a self-assessment against WCAG 2.2 level AA, not an external certification. The results are on the [accessibility page](../accessibility.html).

## Versioning

We follow semantic versioning. The public API is:

- the class `sqs` and the classes `sqs-icon` and `sqs-hint` for rich content,
- every CSS variable listed in [Theming](theming.html),
- the cascade layer name `squirrel`,
- the file path `@3m5-de/squirrel-select/squirrel-select.css`.

Removing or renaming any of these, or dropping one of the paths above, needs a new major version.

Intended visual changes, for example to default colors or spacing, ship in minor releases and are always listed under **Visual changes** in the [release notes](https://github.com/3m5/squirrel-select/releases). Fixes for browser updates ship as patches. If your project has a signed-off design, pin the minor version, for example `~1.2.0`.

Only the latest 1.x release gets fixes. Version 0.x is no longer maintained, see [Migrating from 0.x](migrating.html).
