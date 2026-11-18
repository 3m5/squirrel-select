# Laravel Blade

Import the stylesheet with Vite and add `class="sqs"` to your selects.

## Stylesheet

In `resources/js/app.js`:

```js
import '@3m5-de/squirrel-select/squirrel-select.css'
```

Your layout already loads it with `@vite(['resources/css/app.css', 'resources/js/app.js'])`.

## Markup

```blade
<label for="species">Species</label>
<select class="sqs" id="species" name="species" required
        @error('species') aria-invalid="true" aria-describedby="species-error" @enderror>
  <option value="">Choose a species …</option>
  <option value="red" @selected(old('species') === 'red')>Red squirrel</option>
  <option value="grey" @selected(old('species') === 'grey')>Grey squirrel</option>
</select>
@error('species')
  <p id="species-error">{{ $message }}</p>
@enderror
```

`aria-invalid="true"` shows the error border for errors from the server and tells screen readers. The message itself stays text on your page.

## Watch out for

- If you use Tailwind CSS, set the layer order, see [Troubleshooting](../troubleshooting.html).
- For several choices, add `multiple` and name the field with brackets, such as `name="tags[]"`, so PHP receives an array.
