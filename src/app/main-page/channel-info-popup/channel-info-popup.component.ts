import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelService } from '../../shared/services/channel.service';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';

@Component({
  selector: 'app-channel-info-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './channel-info-popup.component.html',
  styleUrls: ['./channel-info-popup.component.scss']
})
export class ChannelInfoPopupComponent {
  @Input() channel: Channel | null = null;
  @Output() close = new EventEmitter<void>();
  isEditingName = false;
  isEditingDescription = false;
  editedName: string = '';
  editedDescription: string = '';
  createdByName: string = '';
  nameErrorMessage: string = '';
  
  constructor(private channelService: ChannelService, private userService: UserService,private elementRef: ElementRef) { }

  ngOnInit() {
    if (this.channel) {
      this.editedName = this.channel.name ?? '';
      this.editedDescription = this.channel.description ?? '';
      this.userService.getUser(this.channel.createdBy).subscribe((user) => {
        this.createdByName = user.name;
      });
    }
  }

  startEditingName() {
    this.isEditingName = true;
  }

  startEditingDescription() {
    this.isEditingDescription = true;
  }

async saveName() {
    if (this.channel && this.editedName !== this.channel.name) {
      try {
        // Überprüfung auf Duplikate
        const duplicateChannel = await this.channelService.getChannelByName(
          this.editedName,
          this.channel.isPrivate
        );

        if (duplicateChannel && duplicateChannel.id !== this.channel.id) {
          this.nameErrorMessage = 'Ein Channel mit diesem Namen existiert bereits.';
          return;
        }

        const updatedFields = { name: this.editedName };
        await this.channelService.updateChannel(this.channel, updatedFields);
        this.channel.name = this.editedName;
        this.isEditingName = false;
        this.nameErrorMessage = '';
      } catch (error) {
        this.nameErrorMessage = 'Fehler beim Speichern des Namens. Bitte versuchen Sie es erneut.';
      }
    } else {
      this.isEditingName = false;
    }
  }
  
  async saveDescription() {
    if (this.channel && this.editedDescription !== this.channel.description) {
      const updatedFields = { description: this.editedDescription };
      await this.channelService.updateChannel(this.channel, updatedFields);
      this.channel.description = this.editedDescription;
    }
    this.isEditingDescription = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closePopup(event);
    }
  }

  closePopup(event: Event) {
    event.stopPropagation();
    this.close.emit();
  }
}
