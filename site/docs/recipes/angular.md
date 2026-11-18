# Angular

It is a normal `<select>`. Load the stylesheet globally, add `class="sqs"`, and bind it with reactive forms or `ngModel` as usual.

## Stylesheet

Import it in your global stylesheet, `src/styles.css`:

```css
@import '@3m5-de/squirrel-select/squirrel-select.css';
```

Do not add it to a component's `styleUrls`. Angular scopes component styles, so the stylesheet would only reach selects inside that one component.

## Markup

```html
<label for="species">Species</label>
<select class="sqs" id="species" formControlName="species" required>
  <option value="">Choose a species …</option>
  <option value="red">Red squirrel</option>
  <option value="grey">Grey squirrel</option>
</select>
```

## Watch out for

- Variables do work in component styles, because CSS variables pass through the scoping: `:host { --sqs-accent: light-dark(#b0185a, #ff8cc6); }`.
- Rules for the open list (`::picker(select)`) belong in the global stylesheet, inside `@supports (appearance: base-select)`, see [Theming](../theming.html).
