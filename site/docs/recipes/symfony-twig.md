# Symfony and Twig

Load the stylesheet with your asset setup and give the form field the class `sqs`.

## Stylesheet

With Webpack Encore, in `assets/app.js`:

```js
import '@3m5-de/squirrel-select/squirrel-select.css'
```

Without a bundler, copy `dist/squirrel-select.css` from the npm package to `public/css/` and link it:

```twig
<link rel="stylesheet" href="{{ asset('css/squirrel-select.css') }}">
```

## Markup

In the template:

```twig
{{ form_label(form.species) }}
{{ form_widget(form.species, {attr: {class: 'sqs'}}) }}
```

Or once in the form type:

```php
$builder->add('species', ChoiceType::class, [
    'choices' => ['Red squirrel' => 'red', 'Grey squirrel' => 'grey'],
    'placeholder' => 'Choose a species …',
    'attr' => ['class' => 'sqs'],
]);
```

`placeholder` adds the empty first option with text.

## Watch out for

- The form theme `bootstrap_5_layout.html.twig` adds `form-select` to every select. Bootstrap's CSS is not in a layer and wins over ours. Render these fields without the Bootstrap theme or override the theme block for them.
