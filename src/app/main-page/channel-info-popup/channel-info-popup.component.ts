import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelService } from '../../shared/services/channel.service';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';
import { ChatService } from '../../shared/services/chat-service.service';

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

  constructor(private channelService: ChannelService, private userService: UserService, private elementRef: ElementRef, private chatService: ChatService, private authService: AuthService) { }

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

  async saveName(): Promise<void> {
    if (!this.channel) {
      this.isEditingName = false;
      return;
    }
  
    if (this.editedName === this.channel.name) {
      this.isEditingName = false;
      return;
    }
  
    const validationError = this.validateName(this.editedName);
    if (validationError) {
      this.nameErrorMessage = validationError;
      return;
    }
  
    try {
      const isDuplicate = await this.isDuplicateChannelName(this.editedName);
      if (isDuplicate) {
        this.nameErrorMessage = 'Ein Channel mit diesem Namen existiert bereits.';
        return;
      }
  
      await this.updateChannelName();
    } catch (error) {
      console.error('Fehler beim Speichern des Namens:', error);
      this.nameErrorMessage = 'Fehler beim Speichern des Namens. Bitte versuchen Sie es erneut.';
    }
  }
  
  private validateName(name: string): string | null {
    if (name.length > 17) {
      return 'Der Channel-Name darf maximal 17 Zeichen lang sein.';
    }
    return null;
  }
  
  private async isDuplicateChannelName(name: string): Promise<boolean> {
    const duplicateChannel = await this.channelService.getChannelByName(name, this.channel!.isPrivate);
    return !!duplicateChannel && duplicateChannel.id !== this.channel!.id;
  }
  
  private async updateChannelName(): Promise<void> {
    const updatedFields = { name: this.editedName };
    await this.channelService.updateChannel(this.channel!, updatedFields);
    this.channel!.name = this.editedName;
    this.isEditingName = false;
    this.nameErrorMessage = '';
  }

  async saveDescription() {
    if (this.channel && this.editedDescription !== this.channel.description) {
      const updatedFields = { description: this.editedDescription };
      await this.channelService.updateChannel(this.channel, updatedFields);
      this.channel.description = this.editedDescription;
    }
    this.isEditingDescription = false;
  }

  async leaveChannel() {
    const currentUser = this.authService.getCurrentUser();

    if (this.channel && currentUser) {
      try {
        await this.channelService.removeUserFromChannel(this.channel.id, currentUser.uid, this.channel.isPrivate);
        this.chatService.setCurrentChat(null, false);
        this.close.emit();
      } catch (error) {
        console.error('Fehler beim Verlassen des Channels:', error);
      }
    }
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
