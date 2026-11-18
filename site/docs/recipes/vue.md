# Vue and Nuxt

It is a normal `<select>`. Import the stylesheet once, add `class="sqs"`, and bind it with `v-model` as usual.

## Stylesheet

Vue with Vite, in `main.ts`:

```js
import '@3m5-de/squirrel-select/squirrel-select.css'
```

Nuxt, in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  css: ['@3m5-de/squirrel-select/squirrel-select.css'],
})
```

## Markup

```vue
<script setup>
import { ref } from 'vue'
const species = ref('')
</script>

<template>
  <label for="species">Species</label>
  <select class="sqs" id="species" name="species" required v-model="species">
    <option value="">Choose a species …</option>
    <option value="red">Red squirrel</option>
    <option value="grey">Grey squirrel</option>
  </select>
</template>
```

## Watch out for

- Variables work in `<style scoped>` when the select is in the same template: `.filters { --sqs-accent: light-dark(#b0185a, #ff8cc6); }`.
- Rules for the open list (`::picker(select)`) belong in a global stylesheet, inside `@supports (appearance: base-select)`, see [Theming](../theming.html).
