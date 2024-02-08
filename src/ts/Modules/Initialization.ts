import { createDropdown } from './DropdownCreation'
import { observeSelectElement } from './StateSynchronization'
import { setEventListener } from './EventHandling'

const dropdownStart = () => {
  // Only get select elements that haven't been initialized already
  const selects = document.querySelectorAll<HTMLSelectElement>('.sqs-dropdown-select:not([data-sqs-initialized])')

  selects.forEach((select: HTMLSelectElement) => {
    const newDropdown = createDropdown(select)
    if (newDropdown) {
      select.insertAdjacentElement('afterend', newDropdown)
      select.classList.add('hidden')
      select.setAttribute('data-sqs-initialized', 'true')
      setEventListener(newDropdown)
      observeSelectElement(select)
    }
  })
}

export const initDropdown = (selector= '.sqs-dropdown-select') => {
  dropdownStart()

  // MutationObserver that checks for any new select elements being added after the initial page load
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.querySelector(`${selector}:not([data-sqs-initialized])`)) {
            dropdownStart()
          }
        })
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

