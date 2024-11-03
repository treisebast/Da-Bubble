import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-image-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-overlay.component.html',
  styleUrls: ['./image-overlay.component.scss']
})
export class ImageOverlayComponent {
  @Input() imageUrl: string | null = null;
  @Output() closeOverlay = new EventEmitter<void>();

  /**
   * Emits the `closeOverlay` event to notify that the overlay should be closed.
   */
  onClose() {
    this.closeOverlay.emit();
  }

  /**
   * Initiates the download of the displayed image.
   */
  async downloadImage() {
    if (!this.imageUrl) return;

    try {
      const response = await fetch(this.imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Netzwerkantwort war nicht ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = this.extractFileName(this.imageUrl, blob.type);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
    }
  }

  /**
   * Extrahiert einen kürzeren und sinnvollen Dateinamen aus der imageUrl.
   * @param url Die Bild-URL
   * @param mimeType Der MIME-Typ des Blobs
   * @returns Ein string, der den Dateinamen darstellt
   */
  private extractFileName(url: string, mimeType: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const path = decodeURIComponent(pathname);
      const segments = path.split('/');
      let filename = 'downloaded-image';

      for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i].includes('.')) {
          filename = segments[i].split('?')[0];
          break;
        }
      }
      if (!filename.includes('.')) {
        const extension = mimeType.split('/')[1] || 'jpg';
        filename = `image.${extension}`;
      }

      return filename;
    } catch (e) {
      return 'downloaded-image.jpg';
    }
  }
}
