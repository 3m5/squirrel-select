# Documentation

SquirrelSelect is one stylesheet for the native `<select>`. Install it, change the look with CSS variables, and see what each browser shows.

## The short version

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@3m5-de/squirrel-select@1/dist/squirrel-select.css">
<select class="sqs">…</select>
```

That is the whole setup. Everything below is detail.

## Start here

- **[Quickstart](quickstart.html)**

  From install to your first color in three steps.

- **[Frameworks](frameworks/html.html)**

  React, Vue, Svelte, Angular, TYPO3, Symfony, Laravel or plain HTML.

- **[Theming](theming.html)**

  Where to set CSS variables, sizes, your own arrow, recipes.

- **[How it works](how-it-works.html)**

  Why Firefox and phones show the system list, with screenshots from our tests.

## Help

- Something looks wrong? [Troubleshooting](troubleshooting.html) covers the usual causes and has a console check for your page.
- Coming from 0.x? [Migrating](migrating.html) walks you through it step by step.
- Looking up a value? [CSS variables](variables.html) lists every variable with its default.

## What you can rely on

SquirrelSelect follows semantic versioning. The class names, the CSS variables, the layer name `squirrel` and the file path only change in a major version. Details in [Browser support and versioning](browser-support.html). Test results by browser and screen reader are on the [accessibility page](../accessibility.html).

## What comes next

The core stays CSS only. An optional search module for long lists is planned for version 1.1. It will only run where you switch it on.
