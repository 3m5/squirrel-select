# React and Next.js

It is a normal `<select>`. Import the stylesheet once and use `className="sqs"`. There is no wrapper component, and you do not need one.

## Stylesheet

Import it once at the top of your app, in `main.tsx` with Vite, or in `app/layout.tsx` with the Next.js App Router:

```js
import '@3m5-de/squirrel-select/squirrel-select.css'
```

## Markup

```jsx
export function SpeciesSelect({ value, onChange }) {
  return (
    <>
      <label htmlFor="species">Species</label>
      <select className="sqs" id="species" name="species" required
              value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Choose a species …</option>
        <option value="red">Red squirrel</option>
        <option value="grey">Grey squirrel</option>
      </select>
    </>
  )
}
```

Controlled and uncontrolled selects both work as usual, because nothing is added to the DOM.

## Watch out for

- `className`, not `class`; `htmlFor`, not `for`.
- Set the chosen value with `value` or `defaultValue` on the select, not with `selected` on an option.
- Server rendering is no problem: the core is CSS only.
- Theming per component: set variables in `style`, for example `style={{ '--sqs-accent': '#b0185a' }}`. In TypeScript this needs a cast, such as `as React.CSSProperties`.
