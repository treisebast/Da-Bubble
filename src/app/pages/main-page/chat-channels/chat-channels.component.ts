import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ChannelService } from '../../../shared/services/channel.service';
import { Channel } from '../../../shared/models/channel.model';
import { ChatUserProfile } from '../../../shared/models/chat-user-profile.model';
import { DialogAddChannelComponent } from '../../../dialog-add-channel/dialog-add-channel.component';


@Component({
  selector: 'app-chat-channels',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './chat-channels.component.html',
  styleUrls: ['./chat-channels.component.scss']
})
export class ChatChannelsComponent implements OnInit {
  menuChannelDropdown: boolean = true;
  directMessages: boolean = true;
  readonly dialog = inject(MatDialog);
  private channelService = inject(ChannelService);

  allChannels: Channel[] = [];
  allDirectMessages: ChatUserProfile[] = [
    {
      name: "Marco Amman",
      imgScr: "./assets/img/profile/1.svg",
      online: true
    },
    {
      name: "Sebastian Treittinger",
      imgScr: "./assets/img/profile/2.svg",
      online: true
    },
    {
      name: "Aristotelis Stratis",
      imgScr: "./assets/img/profile/3.svg",
      online: false
    },
    {
      name: "Tobias Wall",
      imgScr: "./assets/img/profile/4.svg",
      online: false
    }
  ];

  ngOnInit() {
    this.channelService.getChannels().subscribe(channels => {
      this.allChannels = channels;
    });
  }

  openMenuChannel() {
    this.menuChannelDropdown = !this.menuChannelDropdown;
  }

  openDirectMessages() {
    this.directMessages = !this.directMessages;
  }

  addNewChannel() {
    const dialogRef = this.dialog.open(DialogAddChannelComponent, {
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Channel created:', result);
      }
    });
  }

  showChannel(channel: Channel) {
    console.log('Showing channel:', channel);
    // Your logic to show the selected channel
  }

  showDirectMessage(directMessage: ChatUserProfile) {
    console.log('Showing direct message:', directMessage);
    // Your logic to show the selected direct message
  }
}
