/**
 * Sets an error message on the given component and clears it after a timeout.
 * @param {Object} component - The component on which to set the error message.
 * @param {string} message - The error message to display.
 * @returns {void}
 */
export function setErrorMessage(component: any, message: string): void {
  component.errorMessage = message;
  if (component.errorTimeout) {
    clearTimeout(component.errorTimeout);
  }
  component.errorTimeout = setTimeout(() => {
    component.errorMessage = null;
  }, 4000);
}

/**
 * Clears any existing error message and timeout on the component.
 * @param {Object} component - The component from which to clear the error message.
 * @returns {void}
 */
export function clearErrorMessage(component: any): void {
  component.errorMessage = null;
  if (component.errorTimeout) {
    clearTimeout(component.errorTimeout);
    component.errorTimeout = null;
  }
}
