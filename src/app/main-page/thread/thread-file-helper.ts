import { Inject, Injectable } from '@angular/core';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { Firestore, collection, doc } from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { FileValidationResult } from '../../shared/models/file.model';
import { DOCUMENT } from '@angular/common';

@Injectable({
    providedIn: 'root',
})
export class ThreadFileHelper {
    constructor(private firebaseStorageService: FirebaseStorageService,
        @Inject(DOCUMENT) private document: Document

    ) { }

    /**
     * Uploads a file and returns its download URL.
     * @param file - The file to be uploaded.
     * @param chatId - The ID of the current chat.
     * @param firestore - Firestore instance.
     * @returns The download URL of the file.
     */
    async uploadAttachment(file: File, chatId: string, firestore: Firestore): Promise<string> {
        const autoId = doc(collection(firestore, 'dummy')).id;
        const filePath = `thread-files/${chatId}/${autoId}_${file.name}`;
        const downloadUrl = await firstValueFrom(
            this.firebaseStorageService.uploadFile(file, filePath)
        );
        return downloadUrl as string;
    }

    /**
     * Extracts the file path from the given URL.
     * @param fileUrl - The URL of the file.
     * @returns The file path.
     */
    getFilePathFromUrl(fileUrl: string): string {
        return decodeURIComponent(fileUrl).split('/o/')[1].split('?alt=media')[0];
    }

    /**
     * Loads the metadata of a file (name and size).
     * @param attachmentUrl - The URL of the file.
     * @returns A promise containing an object with the file's name and size.
     */
    async loadFileMetadata(attachmentUrl: string): Promise<{ name: string; size: number }> {
        const filePath = this.getFilePathFromUrl(attachmentUrl);
        const metadata = await firstValueFrom(this.firebaseStorageService.getFileMetadata(filePath));
        return { name: metadata.name, size: metadata.size };
    }

    /**
     * Deletes a file based on its file path.
     * @param fileUrl - The URL of the file to be deleted.
     * @returns A promise that completes the delete operation.
     */
    async deleteFile(fileUrl: string): Promise<void> {
        const filePath = this.getFilePathFromUrl(fileUrl);
        await firstValueFrom(this.firebaseStorageService.deleteFile(filePath));
    }

    /**
     * Generates a preview URL for images or returns a default PDF icon for PDF files.
     * @param file - The file to generate a preview for.
     * @returns A promise with the preview URL.
     */
    async createFilePreview(file: File): Promise<string | null> {
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
      * Validates a file based on size and type restrictions.
      * @param file - The file to be validated.
      * @param maxSizeInKB - Maximum allowed file size in KB (default is 500).
      * @param allowedTypes - Array of allowed MIME types (default is PNG, JPEG, PDF).
      * @returns An object containing validation status and an error message if invalid.
      */
    isValidFile(
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
     * Formats the file size into a readable string (e.g., KB, MB).
     * @param size - The file size in bytes.
     * @returns The formatted size as a readable string.
     */
    formatFileSize(size: number): string {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`;
        } else {
            return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    /**
 * Initiates the download of the displayed PDF.
 * @param attachmentUrl - Die URL des PDFs
 * @param metadataMap - Map of metadata for attachments
 */
    async downloadPdf(attachmentUrl: string, metadataMap: { [url: string]: { name: string; size: number } }): Promise<void> {
        if (!attachmentUrl) return;

        try {
            // Hole den Download-Link direkt
            const response = await fetch(attachmentUrl, { mode: 'cors' });
            if (!response.ok) throw new Error('Netzwerkantwort war nicht ok');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const attachmentName = metadataMap[attachmentUrl]?.name || this.extractFileName(attachmentUrl, blob.type) || 'downloaded-file.pdf';

            const link = this.document.createElement('a');
            link.href = url;
            link.download = attachmentName;
            this.document.body.appendChild(link);
            link.click();
            this.document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
        }
    }

    /**
     * Extracts a shorter and meaningful file name from the imageUrl or attachmentUrl.
     * @param url - The URL of the file
     * @param mimeType - The MIME type of the blob
     * @returns A string that represents the file name
     */
    extractFileName(url: string, mimeType: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const path = decodeURIComponent(pathname);
            const segments = path.split('/');
            let filename = 'downloaded-file.pdf';

            for (let i = segments.length - 1; i >= 0; i--) {
                if (segments[i].includes('.')) {
                    filename = segments[i].split('?')[0];
                    break;
                }
            }

            if (!filename.includes('.')) {
                const extension = mimeType.split('/')[1] || 'pdf';
                filename = `file.${extension}`;
            }

            return filename;
        } catch (e) {
            return 'downloaded-file.pdf';
        }
    }
}
