export function setErrorMessage(component: any, message: string): void {
    component.errorMessage = message;
    if (component.errorTimeout) {
      clearTimeout(component.errorTimeout);
    }
    component.errorTimeout = setTimeout(() => {
      component.errorMessage = null;
    }, 4000);
  }
  
  export function clearErrorMessage(component: any): void {
    component.errorMessage = null;
    if (component.errorTimeout) {
      clearTimeout(component.errorTimeout);
      component.errorTimeout = null;
    }
  }
  