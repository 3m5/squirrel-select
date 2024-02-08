import { className, createOption } from '../Helpers/constantsAndHelpers'
import { selectOption } from './EventHandling'

/**
 * This makes sure that the selected option is always synchronized between the
 * select element and its corresponding sqs_dropdown representation.
 * In order to make sure that this fires when you manually force a certain option
 * to be selected, an "sqsUpdate" event needs to be dispatched after changing the element's value.
 *
 * E.g.: selectElement.value = 'foo';
 *       selectElement.dispatchEvent(new Event('sqsUpdate'));
 *
 * Unfortunately, the MutationObserver alone is unable to observe this kind of change
 * because it doesn't affect the DOM tree itself.
 *
 * @param select
 */
export const observeSelectElement = (select: HTMLSelectElement) => {
  select.addEventListener('sqsUpdate', () => {
    const optionSelected = select.querySelector<HTMLOptionElement>(`option[value="${select.value}"]`)
    const dropdownSelect = select.nextElementSibling?.querySelector<HTMLElement>(`.${className.select}`)
    const dropdownSelectTriggerSpan = dropdownSelect?.querySelector<HTMLSpanElement>(`.${className.selectTrigger} span`)
    const dropdownSelectOptions = dropdownSelect?.querySelector<HTMLElement>(`.${className.selectOptions}`)

    if (dropdownSelectTriggerSpan && optionSelected && dropdownSelectTriggerSpan.textContent !== optionSelected.textContent) {
      dropdownSelectTriggerSpan.textContent = optionSelected.textContent
      dropdownSelectOptions?.querySelectorAll<HTMLSpanElement>(`.${className.selectOption}`).forEach(el => {
        el.classList.toggle(className.selected, el.dataset.value === select.value)
      })
    }
  })

  const observer = new MutationObserver(mutationList => {
    for (const mutation of mutationList) {
      if (mutation.type === 'childList') {
        const dropdownSelectOptions = select.nextElementSibling?.querySelector<HTMLElement>(`.${className.selectOptions}`)
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLOptionElement) {
            dropdownSelectOptions?.querySelector<HTMLElement>(`[data-value="${node.value}"]`)?.remove()
          }
        })
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLOptionElement) {
            const optionSpan = createOption(node)
            dropdownSelectOptions?.appendChild(optionSpan)
            optionSpan.addEventListener('click', e => selectOption(e))
          }
        })
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
        const dropdownSelect = select.nextElementSibling?.querySelector<HTMLElement>(`.${className.select}`)
        dropdownSelect?.classList.toggle('select__disabled', select.hasAttribute('disabled'))
      }
    }
  })

  observer.observe(select, { attributes: true, childList: true, subtree: true })
}
