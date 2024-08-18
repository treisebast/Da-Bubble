import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule for basic Angular directives
import { Channel } from '../../shared/models/channel.model';

@Component({
  selector: 'app-channel-info-popup',
  standalone: true, // Mark as standalone
  imports: [CommonModule], // Import CommonModule if needed for *ngIf, *ngFor, etc.
  templateUrl: './channel-info-popup.component.html',
  styleUrls: ['./channel-info-popup.component.scss']
})
export class ChannelInfoPopupComponent {
  @Input() channel: Channel | null = null;

  closePopup() {
    this.channel = null; // Reset channel to close the popup
  }
}
