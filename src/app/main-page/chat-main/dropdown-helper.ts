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
  