import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-image-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-overlay.component.html',
  styleUrl: './image-overlay.component.scss'
})

export class ImageOverlayComponent {
  @Input() imageUrl: string | null = null;
  @Output() closeOverlay = new EventEmitter<void>();

  onClose() {
    this.closeOverlay.emit();
  }
}