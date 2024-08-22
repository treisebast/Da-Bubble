import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';
import { ChannelService } from '../../shared/services/channel.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { Channel } from '../../shared/models/channel.model';
import { User } from '../../shared/models/user.model';

interface UserWithImageStatus extends User {
  isImageLoaded?: boolean;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent implements OnInit {
  menuChannelIsDropedDown = false;
  directMessagesIsDropedDown = false;

  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  workspaceUsers: UserWithImageStatus[] = [];
  currentUser!: UserWithImageStatus;
  privateChannelMembersMap: { [channelId: string]: UserWithImageStatus } = {};

  constructor(
    private channelService: ChannelService,
    private chatService: ChatService,
    private dialog: MatDialog,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.subscribeToCurrentUser();
  }

  /**
   * Subscribe to the current user from the AuthService
   * and load initial data once the user is retrieved.
   */
  private subscribeToCurrentUser() {
    this.authService.getUser().subscribe((firebaseUser) => {
      if (firebaseUser) {
        this.userService.getUser(firebaseUser.uid).subscribe((user) => {
          this.currentUser = { ...user, isImageLoaded: false };
          this.loadInitialData();
        });
      }
    });
    this.openMenuChannel();
  }

  /**
   * Load initial data including public channels, private chats,
   * and workspace users.
   */
  private loadInitialData() {
    this.loadPublicChannels();
    this.loadPrivateChats();
    this.showWorkspaceUsers();
  }

  /**
   * Load public channels from the ChannelService.
   */
  private async loadPublicChannels() {
    try {
      this.channelService.getChannels(false).subscribe((channels) => {
        this.publicChannels = channels;
        console.log('Public channels:', this.publicChannels);
      });
    } catch (error) {
      console.error('Error loading public channels:', error);
    }
  }

  /**
   * Load private chats from the ChannelService.
   */
  private async loadPrivateChats() {
    try {
      this.channelService.getChannels(true).subscribe((channels) => {
        this.privateChannels = channels.filter(
          (channel) =>
            channel.createdBy === this.currentUser.userId && channel.id
        );
        console.log('Private channels:', this.privateChannels);
        this.loadPrivateChannelMembers();
      });
    } catch (error) {
      console.error('Error loading private channels:', error);
    }
  }

  /**
   * Show workspace users by retrieving them from the UserService.
   */
  private async showWorkspaceUsers() {
    try {
      this.userService.getUsers().subscribe((users) => {
        this.workspaceUsers = users.map((user) => ({
          ...user,
          isImageLoaded: false,
        }));
        this.moveCurrentUserToTop();
        console.log(
          'Workspace users (currentUser on top):',
          this.workspaceUsers
        );
      });
    } catch (error) {
      console.error('Error loading workspace users:', error);
    }
  }

  /**
   * Move the current user to the top of the workspace users list.
   */
  private moveCurrentUserToTop() {
    const currentUserIndex = this.workspaceUsers.findIndex(
      (user) => user.userId === this.currentUser.userId
    );
    if (currentUserIndex !== -1) {
      const currentUser = this.workspaceUsers.splice(currentUserIndex, 1)[0];
      this.workspaceUsers.unshift(currentUser);
    }
  }

  /**
   * Load members of private channels.
   */
  private loadPrivateChannelMembers() {
    this.privateChannels.forEach((channel) => {
      const otherMemberId = channel.members.find(
        (memberId) => memberId !== this.currentUser.userId
      );
      if (otherMemberId) {
        this.userService.getUser(otherMemberId).subscribe({
          next: (user) => {
            this.privateChannelMembersMap[channel.id!] = {
              ...user,
              isImageLoaded: false,
            };
          },
          error: (error) => {
            console.error(
              `Failed to load user with ID: ${otherMemberId} for channel: ${channel.id}`,
              error
            );
          },
        });
      }
    });
  }

  /**
   * Update the image load status for a user.
   * @param userId - The ID of the user.
   * @param status - The image load status.
   */
  updateImageStatus(userId: string, status: boolean) {
    if (this.privateChannelMembersMap[userId]) {
      this.privateChannelMembersMap[userId].isImageLoaded = status;
    }
    const user = this.workspaceUsers.find((user) => user.userId === userId);
    if (user) {
      user.isImageLoaded = status;
    }
  }

  /**
   * Toggle the dropdown state of the menu channel.
   */
  openMenuChannelDropdown() {
    this.menuChannelIsDropedDown = !this.menuChannelIsDropedDown;
  }

  /**
   * Toggle the dropdown state of the direct messages.
   */
  openDirectMessagesDropdown() {
    this.directMessagesIsDropedDown = !this.directMessagesIsDropedDown;
  }

  /**
   * Find or create a private channel with a user.
   * @param user - The user to create a private channel with.
   */
  async findOrCreatePrivateChannelWithUser(user: UserWithImageStatus) {
    let privateChannel = this.privateChannels.find((channel) =>
      channel.members.includes(user.userId)
    );

    if (!privateChannel) {
      privateChannel = await this.createPrivateChannel(user);
    }

    if (privateChannel) {
      this.showChannel(privateChannel);
    }
  }

  /**
   * Create a private channel with a user.
   * @param user - The user to create a private channel with.
   * @returns Promise<Channel> - The created channel.
   */
  private async createPrivateChannel(
    user: UserWithImageStatus
  ): Promise<Channel> {
    const newChannel: Channel = {
      name: `${user.name}`,
      description: '',
      createdBy: this.currentUser.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [this.currentUser.userId, user.userId],
      isPrivate: true,
    };

    try {
      await this.channelService.addChannel(newChannel);
      this.privateChannels.push(newChannel);
      this.loadPrivateChannelMembers();
      return newChannel;
    } catch (error) {
      console.error('Error creating private channel:', error);
      throw error;
    }
  }

  /**
   * Add a new channel by opening a dialog.
   */
  addNewChannel() {
    const dialogRef = this.dialog.open(DialogAddChannelComponent, {
      disableClose: false,
      panelClass: 'addChannelDialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.handleNewChannelResult(result);
      }
    });
  }

  /**
   * Handle the result of the new channel dialog.
   * @param result - The result from the dialog.
   */
  private handleNewChannelResult(result: Channel) {
    if (!result.isPrivate) {
      this.publicChannels.push(result);
    } else {
      this.privateChannels.push(result);
      this.loadPrivateChannelMembers();
    }
  }

  /**
   * Show the selected channel.
   * @param channel - The channel to show.
   */
  showChannel(channel: Channel) {
    console.log('Showing channel:', channel);
    this.chatService.setCurrentChat(channel);
  }

  /**
   * Set the selected message in the chat service.
   */
  setSelectedMessage() {
    this.chatService.setSelectedChat(true);
  }

  /**
   * Create a new message in the chat service.
   */
  newMessage() {
    this.chatService.setSelectedChat(false);
  }
}
