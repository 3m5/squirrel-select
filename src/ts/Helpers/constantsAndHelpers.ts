export const className = {
  dropdownWrapper: 'sqs-dropdown__wrapper',
  selected: 'selected',
  select: 'select',
  selectOption: 'select__option',
  selectOptions: 'select__options',
  selectTrigger: 'select__trigger',
  differentFromDefaultOption: 'different-from-default-option'
}

export const createOption = (option: HTMLOptionElement) => {
  const optionSpan = document.createElement('span')
  optionSpan.classList.add(className.selectOption)
  optionSpan.tabIndex = 0 // Make each option focusable
  if (option.selected) {
    optionSpan.classList.add(className.selected)
  }
  optionSpan.dataset.value = option.value
  optionSpan.textContent = option.text
  return optionSpan
}

export const focusAndCenter = (option: HTMLElement) => {
  option.focus()
  option.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export const closeDropdowns = () => {
  const selects = Array.from(document.querySelectorAll<HTMLElement>(`.${className.select}`))
  selects.forEach(select => {
    select.classList.remove('open')
  })
}
