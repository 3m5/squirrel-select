# Squirrel Select

![Exploding Squirrels](logo_250.jpeg)

[![npm version](https://badge.fury.io/js/@3m5-de%2Fsquirrel-select.svg)](https://badge.fury.io/js/@3m5-de%2Fsquirrel-select) 
[![](https://badgen.net/badge/license/MIT)]()
[![Strict TypeScript Checked](https://badgen.net/badge/TS/Strict "Strict TypeScript Checked")](https://www.typescriptlang.org)

Squirrel Select is a dropdown library.

It will initialize a dropdown for every select element present on the page (or added later) that has the CSS class `sqs-dropdown-select`.
The select element itself receives the classes `hidden` and `sqs-dropdown-select__initialized`, to prevent it from being initialized multiple times.

# Authors & Sponsors

* Maurice Kaltofen - [maurice.kaltofen@3m5.de](mailto:maurice.kaltofen@3m5.de)
* Tim Goßrau - [TimG1804](https://github.com/TimG1804)
* Eugen Schlosser - [spider22133](https://github.com/spider22133)
* Robert Heinig - [robert-heinig](https://github.com/robert-heinig)

*The development and public-releases are generously sponsored by our employer https://www.3m5.de.*

# Documentation

## Installation
```
npm install @3m5-de/squirrel-select
```

## Getting Started

tbd


## Construction of the dropdown.

```
<select class="sqs-dropdown__initialized hidden">
  <!-- The initialized element -->
</select>
<div class="sqs-dropdown__wrapper">
  <div class="select" tabindex="0">
    <div class="select__trigger">
      <span>The current selected element</span>
    </div>
    <div class="select__options">
      <span class="select__option selected" tabindex="0" data-value="option1">The current selected element</span>
      <span class="select__option" tabindex="0" data-value="option2">Another elemen</span>
      <span class="select__option" tabindex="0" data-value="option3">A third Element</span>
      <!-- etc. -->
    </div>
  </div>
</div>
```

- If the dropdown is open, the element with the CSS class `select` has received the CSS class `open`.
- If the dropdown is disabled, the same element has received the CSS class `select__disabled`.

### CSS Class Assignment

With data attributes on the select element, it's possible to add CSS classes to specific parts of the newly created dropdown.
These attributes should be handled like the conventional class attribute (i.e., classes are separated by spaces).

The following data attributes are supported:

    - data-sqs-wrapper-classes → <div class="sqs-dropdown__wrapper">
    - data-sqs-select-classes → <div class="select">
    - data-sqs-select-trigger-classes → <div class="select__trigger">
    - data-sqs-select-options-classes → <div class="select__options">

### Manual Change of the Selected Option

If a change of the selected element is performed programmatically (e.g., by explicitly setting the value),
a change event MUST be dispatched immediately afterward (`select.dispatchEvent(new Event('change'));`), as otherwise, this change will not be reflected in the dropdown.

# Contribution

We will gladly accept contributions. Please send us pull requests.

# Version highlights

## 1.0
The initial release includes the following features:

- Keyboard operability

  - Selecting the dropdown or an option using Tab
  - Opening the dropdown and selecting an option using Enter
  - Closing the dropdown using Esc
  - Selecting an option using arrow keys
  - Searching for an option by typing

- Activation/Deactivation
- can be activated or deactivated by setting or removing the disabled attribute on the associated select element

- Class Assignment
  - it's possible to add classes to specific parts of the newly created dropdown
