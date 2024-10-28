import { FileValidationResult, FileActionResult } from '../../shared/models/file.model';


/**
 * Validates a file based on size and type restrictions.
 * @param file - The file to validate.
 * @param maxSizeInKB - Maximum allowed file size in KB (default is 500).
 * @param allowedTypes - Array of allowed MIME types (default is PNG, JPEG, PDF).
 * @returns An object with validation status and an error message if invalid.
 */
export function isValidFile(
  file: File,
  maxSizeInKB: number = 500,
  allowedTypes: string[] = ['image/png', 'image/jpeg', 'application/pdf']
): FileValidationResult {
  if (file.size > maxSizeInKB * 1024) {
    return { isValid: false, errorMessage: `Die Datei überschreitet die maximal erlaubte Größe von ${maxSizeInKB}KB.` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, errorMessage: 'Nur Bilder (PNG, JPEG) und PDFs sind erlaubt.' };
  }

  return { isValid: true };
}


/**
 * Generates a preview URL for the given file.
 * @param file - The file to generate a preview for.
 * @returns A promise resolving to the preview URL, or a default PDF icon if file is a PDF.
 */
export function createFilePreview(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.type === 'application/pdf') {
      resolve('../../assets/img/chatChannel/pdf.png');
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  });
}


/**
 * Manages file validation and preview creation.
 * @param file - The file to validate and preview.
 * @param maxSizeInKB - Maximum allowed file size in KB (default is 500).
 * @param allowedTypes - Array of allowed MIME types (default is PNG, JPEG, PDF).
 * @returns An object containing a preview URL and file if valid, or an error message if invalid.
 */
export async function handleFileAction(
  file: File,
  maxSizeInKB: number = 500,
  allowedTypes: string[] = ['image/png', 'image/jpeg', 'application/pdf']
): Promise<FileActionResult> {
  const validation = isValidFile(file, maxSizeInKB, allowedTypes);

  if (!validation.isValid) {
    return { errorMessage: validation.errorMessage };
  }

  const previewUrl = await createFilePreview(file);
  return { previewUrl, file };
}