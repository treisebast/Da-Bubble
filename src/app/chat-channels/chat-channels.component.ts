import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';
import { UserProfile } from 'firebase/auth';
import { ChatServiceService } from '../chat-service.service';


export interface Messages {
  myMessage: string;
  answeredMessages: string;
}

export interface ChatUserProfile {
  name: string;
  imgScr: string;
  online: boolean;
  messages: Messages;
}
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
  private chatService = inject(ChatServiceService);

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

  allDirectMessages: ChatUserProfile[] = [
    {
      name: "Marco Amman",
      imgScr: "./assets/img/profile/1.png",
      online: true,
      messages: {
        myMessage: "",
        answeredMessages: ""
      },
    },
    {
      name: "Sebastian Treittinger",
      imgScr: "./assets/img/profile/2.png",
      online: true,
      messages: {
        myMessage: "",
        answeredMessages: ""
      },
    },
    {
      name: "Aristotelis Stratis",
      imgScr: "./assets/img/profile/1.png",
      online: false,
      messages: {
        myMessage: "",
        answeredMessages: ""
      },
    },
    {
      name: "Tobias Wall",
      imgScr: "./assets/img/profile/4.png",
      online: false,
      messages: {
        myMessage: "",
        answeredMessages: ""
      },
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

  showChat(chat: ChatUserProfile) {
    this.chatService.setCurrentChat(chat);
  }
}
