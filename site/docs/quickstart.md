# Quickstart

Load one stylesheet, add `class="sqs"` to your selects, done. No JavaScript, no init call, no wrapper.

## 1. Load the stylesheet

With npm:

```sh
npm install @3m5-de/squirrel-select
```

```js
import '@3m5-de/squirrel-select/squirrel-select.css'
```

Or straight from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@3m5-de/squirrel-select@1/dist/squirrel-select.css">
```

The file is already minified and comes with a source map. For production, pin the exact version and add an `integrity` hash, see the [plain HTML recipe](recipes/html.html).

## 2. Add the class

```html
<label for="species">Species</label>
<select class="sqs" id="species" name="species" required>
  <option value="">Choose a species …</option>
  <option>Red squirrel</option>
  <option>Grey squirrel</option>
</select>
```

An option with `value=""` works as a placeholder: it is shown in a muted color, and `required` makes the browser ask for a real choice.

For a list where people can choose several options, add `multiple`, and `size` for the number of visible rows. The same class styles it. See [Lists](how-it-works.html).

## 3. Make it yours

Set CSS variables on any ancestor, or on the select itself:

```css
.filters {
  --sqs-accent: light-dark(#b0185a, #ff8cc6);
  --sqs-radius: 999px;
}
```

All variables are listed in [Theming](theming.html). Your own CSS outside a layer always wins over ours, because the stylesheet lives in the cascade layer `squirrel`.

For dark mode, declare it on your page. The stylesheet follows your page and never switches on its own:

```css
:root { color-scheme: light dark; }
```

## Three rules for accessible selects

- **Every select has a visible label**, connected with `for` and `id`.
- **Every option has visible text.** Icons alone show up as empty entries in Firefox and on phones.
- **Error messages are text on your page**, connected with `aria-describedby`. Add `aria-invalid="true"` for errors from the server.

If you change colors, keep the contrast in light and dark: at least 4.5:1 for text, 3:1 for the border and the focus ring. More in [Accessibility](../accessibility.html).

## Next steps

- [How it works](how-it-works.html): why Firefox and phones look a little different.
- [Recipes](index.html) for your framework or CMS.
- [Troubleshooting](troubleshooting.html) if your styles do not apply.
