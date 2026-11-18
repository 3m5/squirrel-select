# Plain HTML

No build step needed: link the stylesheet and add the class.

## Stylesheet

To try it out, the major version is enough:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@3m5-de/squirrel-select@1/dist/squirrel-select.css">
```

For production, pin the exact version and add an `integrity` hash, so the browser refuses a changed file:

```html
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@3m5-de/squirrel-select@1.0.0/dist/squirrel-select.css"
      integrity="sha384-…" crossorigin="anonymous">
```

Compute the hash from the pinned URL:

```sh
curl -s https://cdn.jsdelivr.net/npm/@3m5-de/squirrel-select@1.0.0/dist/squirrel-select.css | openssl dgst -sha384 -binary | openssl base64 -A
```

Or host the file yourself: copy `dist/squirrel-select.css` from the npm package next to your other assets and link it. Then no third-party server is involved.

## Markup

```html
<label for="species">Species</label>
<select class="sqs" id="species" name="species" required>
  <option value="">Choose a species …</option>
  <option>Red squirrel</option>
  <option>Grey squirrel</option>
</select>
```

## Watch out for

- An unpinned `@1` can change with every release. Use it for trying out, not for production.
- An `integrity` hash only fits one exact version.
- For a list with several choices, add `multiple` and set the visible rows with `size`, for example `<select class="sqs" name="colors" multiple size="5">`.
