# Icons and hints in options

Show a flag, an icon or a short hint in each option. Works in Chrome, Edge and Safari 27+ with a mouse or trackpad; elsewhere options show their text.

## Markup

Use the classes `sqs-icon` and `sqs-hint` inside the option, and add `<selectedcontent>` as the first child of the select to show the icon in the closed field:

```html
<label for="country">Country</label>
<select class="sqs" id="country" name="country">
  <button><selectedcontent></selectedcontent></button>
  <option value="de"><img class="sqs-icon" src="flags/de.svg" alt=""> <span>Germany</span> <span class="sqs-hint">EUR</span></option>
  <option value="ch"><img class="sqs-icon" src="flags/ch.svg" alt=""> <span>Switzerland</span> <span class="sqs-hint">CHF</span></option>
</select>
```

## What people see where

- **In the open list** (Chrome, Edge, Safari 27+ with a mouse or trackpad): icon, text and hint.
- **In the closed field:** icon and text. The hint is hidden visually, and screen readers still read it, like with the native select.
- **In Firefox, on phones and in forced colors:** the text only, here "Germany EUR".

Icons and hints work in the open list only, not in list boxes.

## Rules for accessible options

- **Every option needs real text.** An option with only an icon shows up empty in Firefox and on phones.
- **Put a space between the parts,** so the text reads "Germany EUR", not "GermanyEUR".
- **Images are decoration:** `alt=""`.
- **No buttons or links inside options.**

## Long text

In Chrome and Edge, the closed field only ends long text with "…" when the select contains `<selectedcontent>`, as in the example above. See [Long text](theming.html#long-text) in Theming.
