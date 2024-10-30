/**
 * Handles keyboard events for dropdown navigation and selection.
 * @param {KeyboardEvent} event - The keyboard event triggered by user input.
 * @param {Object} dropdownComponent - The dropdown component with navigation methods.
 * @param {Function} closeDropdown - Function to close the dropdown.
 * @param {Function} selectItem - Function to select the currently highlighted item.
 */
export function handleDropdownKeydown(
  event: KeyboardEvent,
  dropdownComponent: any,
  closeDropdown: () => void,
  selectItem: () => void
) {
  if (event.key === 'Escape') {
    closeDropdown();
    event.preventDefault();
  } else if (event.key === 'ArrowDown') {
    dropdownComponent.moveSelectionDown();
    event.preventDefault();
  } else if (event.key === 'ArrowUp') {
    dropdownComponent.moveSelectionUp();
    event.preventDefault();
  } else if (event.key === 'Enter') {
    selectItem();
    event.preventDefault();
  }
}
