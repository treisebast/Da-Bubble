import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';

@Component({
  selector: 'app-chat-channels',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './chat-channels.component.html',
  styleUrl: './chat-channels.component.scss'
})
export class ChatChannelsComponent {

  menuChannelDropdown: boolean = true;
  directMessages: boolean = true;
  readonly dialog = inject(MatDialog);

  allChannels = [
    {
      name: "Entwickler Team",
    },
    {
      name: "Office Team",
    },
    {
      name: "Test Team",
    }
  ]

  allDirectMessages = [
    {
      name: "Marco Amman",
      imgScr: "./assets/img/profile/1.png",
      online: true
    },
    {
      name: "Sebastian Treittinger",
      imgScr: "./assets/img/profile/2.png",
      online: true
    },
    {
      name: "Aristotelis Stratis",
      imgScr: "./assets/img/profile/1.png",
      online: false
    },
    {
      name: "Tobias Wall",
      imgScr: "./assets/img/profile/4.png",
      online: false
    }
  ]

  openMenuChannel() {
    this.menuChannelDropdown = !this.menuChannelDropdown;
  }

  openDirectMessages() {
    this.directMessages = !this.directMessages;
  }

  addNewChannel() {
    this.dialog.open(DialogAddChannelComponent);
  }
}
