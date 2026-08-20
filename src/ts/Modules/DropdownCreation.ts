import { className, createOption } from '../Helpers/constantsAndHelpers'

const assignClasses = (element: HTMLElement, classes: string) => {
  classes.split(/\s+/).filter(Boolean).forEach(className => element.classList.add(className))
}

export const createDropdown = (select: HTMLSelectElement) => {
  const dropdownWrapper = document.createElement('div')
  dropdownWrapper.classList.add(className.dropdownWrapper)

  const selectDiv = document.createElement('div')
  selectDiv.classList.add(className.select)
  // Disable element if select is disabled
  selectDiv.classList.toggle(
    'select__disabled',
    select.hasAttribute('disabled') ?? false
  )
  selectDiv.tabIndex = select.hasAttribute('disabled') ? -1 : 0

  const selectTrigger = document.createElement('div')
  selectTrigger.classList.add(className.selectTrigger)
  const selectedOption = [...select.options].find(option => option.selected)
  const triggerSpan = document.createElement('span')
  triggerSpan.textContent = selectedOption ? selectedOption.text : ''
  selectTrigger.appendChild(triggerSpan)

  const selectOptionsDiv = document.createElement('div')
  selectOptionsDiv.classList.add(className.selectOptions);
  [...select.options].forEach(option => {
    selectOptionsDiv.appendChild(createOption(option))
  })

  for (const data in select.dataset) {
    switch (data) {
    case 'sqsWrapperClasses':
      assignClasses(dropdownWrapper, select.dataset[data] || '')
      break
    case 'sqsSelectClasses':
      assignClasses(selectDiv, select.dataset[data] || '')
      break
    case 'sqsSelectTriggerClasses':
      assignClasses(selectTrigger, select.dataset[data] || '')
      break
    case 'sqsSelectOptionsClasses':
      assignClasses(selectOptionsDiv, select.dataset[data] || '')
      break
    }
  }

  if (select.classList.contains(className.differentFromDefaultOption)) {
    selectTrigger.classList.add(className.differentFromDefaultOption)
  }

  selectDiv.appendChild(selectTrigger)
  selectDiv.appendChild(selectOptionsDiv)
  dropdownWrapper.appendChild(selectDiv)

  return dropdownWrapper
}
