# Svelte and SvelteKit

Use SquirrelSelect in Svelte and SvelteKit: import the stylesheet once, add `class="sqs"` to a normal `<select>`, and bind it with `bind:value`.

## Stylesheet

In SvelteKit, import it in the root layout, `src/routes/+layout.svelte`:

```svelte
<script>
  import '@3m5-de/squirrel-select/squirrel-select.css'
  let { children } = $props()
</script>

{@render children()}
```

With plain Svelte and Vite, import it in `main.js` instead.

## Markup

```svelte
<script>
  let species = $state('')
</script>

<label for="species">Species</label>
<select class="sqs" id="species" name="species" required bind:value={species}>
  <option value="">Choose a species …</option>
  <option value="red">Red squirrel</option>
  <option value="grey">Grey squirrel</option>
</select>
```

## Watch out for

- Variables work in component styles: `.filters { --sqs-accent: light-dark(#b0185a, #ff8cc6); }`.
- Rules for the open list (`::picker(select)`) belong in a global stylesheet, inside `@supports (appearance: base-select)`, see [Theming](../theming.html).
- For several choices, add `multiple`; `bind:value` then holds an array.
