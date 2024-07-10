import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-chat-channels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-channels.component.html',
  styleUrl: './chat-channels.component.scss'
})
export class ChatChannelsComponent {

  menuChannelDropdown: boolean = true;
  directMessages: boolean = true;
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
    },
    {
      name: "Sebastian Treittinger",
    },
    {
      name: "Aristotelis Stratis",
    },
    {
      name: "Tobias Wall",
    }
  ]

  openMenuChannel() {
    this.menuChannelDropdown = !this.menuChannelDropdown;
  }

  openDirectMessages() {
    this.directMessages = !this.directMessages;
  }

  addNewChannel() {

  }

  addNewDirectMessage() {

  }
}
