import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';
import { ChannelService } from '../../shared/services/channel.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { Channel } from '../../shared/models/channel.model';
import { DirectMessageService } from '../../shared/services/direct-message.service';
import { AuthService } from '../../shared/services/auth.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent implements OnInit {
  menuChannelDropdown: boolean = true;
  directMessages: boolean = true;

  constructor(
    private channelService: ChannelService,
    private chatService: ChatService,
    private dialog: MatDialog,
    private directMessageService: DirectMessageService,
    private authService: AuthService
  ) {}

  allChannels: Channel[] = [];
  allDirectMessages: User[] = [];

  ngOnInit() {
    this.channelService.getChannels().subscribe(channels => {
      this.allChannels = channels;
    });
    this.authService.getUser().subscribe((currentUser) => {
      if (currentUser) {
        this.directMessageService
          .getUsersWithDirectMessages(currentUser.uid)
          .then((users) => {
            this.allDirectMessages = users;
          });
      }
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
      disableClose: false,
      panelClass: 'addChannelDialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Channel created:', result);
      }
    });
  }

  showChannel(channel: Channel) {
    console.log('Showing channel:', channel);
    this.chatService.setCurrentChat(channel);
  }

  showDirectMessage(directMessage: User) {
    console.log('Showing direct message:', directMessage);
    this.chatService.setCurrentChat(directMessage);
  }

  setSelectedMessage() {
    this.chatService.setSelectedChat(true);
  }

  newMessage() {
    this.chatService.setSelectedChat(false);
  }
}
