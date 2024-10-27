export interface FileValidationResult {
    isValid: boolean;
    errorMessage?: string;
  }
  
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
  