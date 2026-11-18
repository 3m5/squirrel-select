# TYPO3 Fluid

Copy the stylesheet into your site package, include it with Fluid or TypoScript, and add `class="sqs"` to your selects. There is no TYPO3 extension; you do not need one.

## Stylesheet

Copy `dist/squirrel-select.css` from the npm package to your site package, for example to `Resources/Public/Css/squirrel-select.css` (with your frontend build or by hand). Then include it in a Fluid template:

```html
<f:asset.css identifier="squirrel-select" href="EXT:site_package/Resources/Public/Css/squirrel-select.css" />
```

Or with TypoScript:

```typoscript
page.includeCSS.squirrelSelect = EXT:site_package/Resources/Public/Css/squirrel-select.css
```

## Markup

```html
<label for="country">Country</label>
<f:form.select id="country" property="country" options="{countries}" class="sqs"
               prependOptionLabel="Please choose" prependOptionValue="" />
```

`prependOptionLabel` adds the empty first option with text, which works as a placeholder.

## Form framework (EXT:form)

Set the class in the form definition:

```yaml
-
  type: SingleSelect
  identifier: country
  label: Country
  properties:
    elementClassAttribute: sqs
```

## Watch out for

- In the Bootstrap 5 templates of the form framework, the default class is `form-select`. Replace it with `sqs`, do not add both: Bootstrap's CSS is not in a layer and wins.
- Every option needs text. An empty first option without a label shows up as an empty line in Firefox and on phones.
- For several choices, set `multiple="1"` on `f:form.select`, or use the element type `MultiSelect` in the form framework with the same `elementClassAttribute`.
