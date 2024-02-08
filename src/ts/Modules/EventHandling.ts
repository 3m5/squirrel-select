import { className, focusAndCenter, closeDropdowns } from '../Helpers/constantsAndHelpers'

const classNameSelectOption = `.${className.selectOption}`
const classNameSelect = `.${className.select}`

const setValue = (optionSpan: HTMLElement) => {
  const dropdown = optionSpan.closest<HTMLElement>(`.${className.dropdownWrapper}`)
  const select = dropdown?.previousElementSibling as HTMLSelectElement

  if (select && select.children) {
    Array.from(select.children).forEach(child => {
      const option = child as HTMLOptionElement

      if (option.selected) {
        option.selected = false
      }

      if (optionSpan.dataset.value === option.value) {
        option.selected = true
        select.dispatchEvent(new Event('change'))
      }
    })
  }
}

export const selectOption = (e: Event) => {
  const optionSpan = e.target as HTMLElement

  if (!optionSpan?.classList.contains(className.selected)) {
    optionSpan?.parentNode?.querySelector<HTMLElement>(`.${className.selectOption}.${className.selected}`)
      ?.classList.remove(className.selected)
    optionSpan?.classList.add(className.selected)
    const span = optionSpan?.closest<HTMLElement>(`.${className.select}`)
      ?.querySelector<HTMLElement>(`.${className.selectTrigger} span`)

    if (span) {
      span.textContent = optionSpan.textContent
    }
  }

  setValue(optionSpan)
}

export const setEventListener = (newDropdown: HTMLDivElement|null) => {
  if (newDropdown) {
    newDropdown?.addEventListener('click', () => {
      const selectElement = newDropdown.querySelector<HTMLElement>(`.${className.select}`)
      if (selectElement?.classList.contains('select__disabled')) {
        // Prevent dropdown from opening if it's disabled
        return
      }
      selectElement?.classList.toggle('open')

      // Scroll to selected element when opening dropdown
      if (selectElement?.classList.contains('open')) {
        const selectOptionsContainer = selectElement?.querySelector<HTMLElement>(`.${className.selectOptions}`)
        selectOptionsContainer?.querySelectorAll<HTMLElement>(`.${className.selectOption}`).forEach(el => {
          if (el.classList.contains(className.selected)) {
            el.scrollIntoView({ behavior: 'auto', block: 'nearest' })
          }
        })
      }
    })

    Array.from(newDropdown.querySelectorAll<HTMLElement>(`.${className.selectOption}`)).forEach(option => {
      option?.addEventListener('click', e => selectOption(e))
    })

    window.addEventListener('click', e => {
      const selects = Array.from(newDropdown.querySelectorAll<HTMLElement>(`.${className.select}`))

      selects?.forEach(select => {
        if (select && !select.contains(e.target as Node)) {
          select.classList.remove('open')
        }
      })
    })

    // Keyboard navigation and search feature
    let searchStr = ''
    const searchTimeout = 500
    let lastSearchTime = Date.now()

    Array.from(newDropdown.querySelectorAll<HTMLElement>(classNameSelect)).forEach(selectDiv => {
      // Add keydown listener for arrow keys and letter search
      selectDiv.addEventListener('keydown', (e) => {
        const options = Array.from(selectDiv.querySelectorAll<HTMLElement>(classNameSelectOption))
        const currentIndex = options.findIndex(opt => document.activeElement === opt)

        // Arrow keys to navigate options
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault()
          if (currentIndex > 0) {
            focusAndCenter(options[currentIndex - 1])
          }
        }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault()
          if (currentIndex < options.length - 1) {
            focusAndCenter(options[currentIndex + 1])
          }
        }
        // Enter to select
        else if (e.key === 'Enter') {
          if (document.activeElement?.classList.contains(classNameSelectOption.slice(1))) {
            (document.activeElement as HTMLElement).click()
          } else if (selectDiv.classList.contains('open')) {
            closeDropdowns()
          } else {
            selectDiv.classList.add('open')
          }
        }
        // Letter search
        else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
          const currentTime = Date.now()
          if (currentTime - lastSearchTime > searchTimeout) {
            searchStr = ''
          }

          searchStr += e.key.toLowerCase()
          lastSearchTime = currentTime

          const foundOption = options.find(opt => opt.textContent?.toLowerCase().startsWith(searchStr))
          if (foundOption) {
            focusAndCenter(foundOption)
          }
        }

        // Escape key to close dropdown
        if (e.key === 'Escape') {
          closeDropdowns()
        }
      })
    })
  }
}
