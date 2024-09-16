import { Component, Input } from '@angular/core';
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

  isEditingName = false;
  isEditingDescription = false;
  editedName: string = '';
  editedDescription: string = '';
  createdByName: string = '';

  constructor(private channelService: ChannelService, private userService: UserService) { }

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
      const updatedFields = { name: this.editedName };
      await this.channelService.updateChannel(this.channel, updatedFields);
      this.channel.name = this.editedName;
      this.isEditingName = false;
    }
  }

  async saveDescription() {
    if (this.channel && this.editedDescription !== this.channel.description) {
      const updatedFields = { description: this.editedDescription };
      await this.channelService.updateChannel(this.channel, updatedFields);
      this.channel.description = this.editedDescription;
      this.isEditingDescription = false;
    }
  }

  closePopup() {
    this.channel = null;
  }
}
