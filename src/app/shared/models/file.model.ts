/**
 * Represents the result of a file validation check.
 * @property isValid - Indicates if the file meets validation criteria.
 * @property errorMessage - Optional error message if validation fails.
 */
export interface FileValidationResult {
    isValid: boolean;
    errorMessage?: string;
  }
  
  /**
   * Represents the outcome of a file action, including preview and validation.
   * @property previewUrl - Optional URL for the file preview (or null if unavailable).
   * @property errorMessage - Optional error message if an error occurs.
   * @property file - Optional reference to the file, if the action is successful.
   */
  export interface FileActionResult {
    previewUrl?: string | null;
    errorMessage?: string;
    file?: File | null;
  }
  