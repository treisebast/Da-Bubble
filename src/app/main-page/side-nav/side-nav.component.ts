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
import { User, UserWithImageStatus } from '../../shared/models/user.model';
import { SharedChannelService } from '../../shared/services/shared-channel.service';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
})
export class SideNavComponent implements OnInit {
  menuChannelIsDropedDown: boolean = false;
  directMessagesIsDropedDown: boolean = false;

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
    private userService: UserService,
    private sharedChannelService: SharedChannelService
  ) {}

  ngOnInit() {
    this.subscribeToCurrentUser();
    this.sharedChannelService.privateChannels$.subscribe((channels) => {
      this.privateChannels = channels;
    });
  }

  /**
   * Subscribes to the current user and initializes data.
   */
  private subscribeToCurrentUser() {
    this.authService.getUser().subscribe((firebaseUser) => {
      if (firebaseUser) {
        this.userService.getUser(firebaseUser.uid).subscribe((user) => {
          this.currentUser = { ...user, isImageLoaded: false };
          this.loadPublicChannels();
          this.loadPrivateChats();
          this.showWorkspaceUsers();
        });
      }
    });
  }

  /**
   * Loads public channels.
   */
  private async loadPublicChannels() {
    try {
      this.channelService.getChannels(false).subscribe((channels) => {
        this.publicChannels = channels;
        this.sharedChannelService.setPublicChannels(this.publicChannels);
        console.log('Public channels:', this.publicChannels);
      });
    } catch (error) {
      console.error('Error loading public channels:', error);
    }
  }

  /**
   * Loads private chats.
   */
  private async loadPrivateChats() {
    try {
      this.channelService.getChannels(true).subscribe((channels) => {
        this.privateChannels = channels;
        this.sharedChannelService.setPrivateChannels(this.privateChannels);
        console.log('Private channels:', this.privateChannels);
        this.loadPrivateChannelMembers();
      });
    } catch (error) {
      console.error('Error loading private channels:', error);
    }
  }

  /**
   * Shows workspace users.
   * Puts the current user on top of the list.
   */
  private async showWorkspaceUsers() {
    try {
      this.userService.getUsers().subscribe((users) => {
        this.workspaceUsers = users.map((user) => ({
          ...user,
          isImageLoaded: false,
        }));

        const currentUserIndex = this.workspaceUsers.findIndex(
          (user) => user.userId === this.currentUser.userId
        );
        if (currentUserIndex !== -1) {
          const currentUser = this.workspaceUsers.splice(
            currentUserIndex,
            1
          )[0];
          this.workspaceUsers.unshift(currentUser);
        }

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
   * Loads private channel members.
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
   * Handles image load event.
   * @param {string} userId - The ID of the user whose image has loaded.
   */
  onImageLoad(userId: string) {
    if (this.privateChannelMembersMap[userId]) {
      this.privateChannelMembersMap[userId].isImageLoaded = true;
    }
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = true;
    }
  }

  /**
   * Handles image error event.
   * @param {string} userId - The ID of the user whose image failed to load.
   */
  onImageError(userId: string) {
    console.log(`Failed to load image for user ${userId}`);
  }

  /**
   * Toggles the menu channel dropdown.
   */
  openMenuChannelDropdown() {
    this.menuChannelIsDropedDown = !this.menuChannelIsDropedDown;
  }

  /**
   * Toggles the direct messages dropdown.
   */
  openDirectMessagesDropdown() {
    this.directMessagesIsDropedDown = !this.directMessagesIsDropedDown;
  }


  /**
   * Finds or creates a private channel with the specified user.
   *
   * @param user - The user with whom the private channel should be created.
   * @returns A Promise that resolves when the private channel is found or created.
   */
  async findOrCreatePrivateChannelWithUser(user: UserWithImageStatus) {
    const isSelfChat = user.userId === this.currentUser.userId;
    const privateChat = this.findExistingPrivateChannel(user, isSelfChat);

    if (!privateChat) {
      const newChannel = this.createNewChannel(user, isSelfChat);
      await this.addAndSetChannel(newChannel);
    } else {
      this.chatService.setCurrentChat(privateChat, true);
    }
  }


  /**
   * Finds an existing private channel based on the provided user and chat type.
   *
   * @param user - The user with image status.
   * @param isSelfChat - A boolean indicating whether it is a self chat.
   * @returns The found private channel, or undefined if not found.
   */
  findExistingPrivateChannel(user: UserWithImageStatus, isSelfChat: boolean): Channel | undefined {
    return this.privateChannels.find(channel =>
      isSelfChat
        ? channel.members.length === 1 && channel.members.includes(this.currentUser.userId)
        : channel.members.includes(this.currentUser.userId) && channel.members.includes(user.userId)
    );
  }


  /**
   * Creates a new channel.
   *
   * @param user - The user with image status.
   * @param isSelfChat - Indicates if it is a self chat.
   * @returns The newly created channel.
   */
  createNewChannel(user: UserWithImageStatus, isSelfChat: boolean): Channel {
    return {
      name: isSelfChat ? 'Personal Notes' : `${user.name}`,
      description: isSelfChat ? 'Your personal space' : '',
      createdBy: this.currentUser.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: isSelfChat ? [this.currentUser.userId] : [this.currentUser.userId, user.userId],
      isPrivate: true,
    };
  }


  /**
   * Adds a new channel and sets it as the current chat.
   *
   * @param newChannel - The new channel to be added.
   * @returns A Promise that resolves to void.
   * @throws An error if there is an issue creating the private channel.
   */
  async addAndSetChannel(newChannel: Channel) {
    try {
      const docRef = await this.channelService.addChannel(newChannel);
      const createdChannel = { ...newChannel, id: docRef.id };
      this.privateChannels.push(createdChannel);
      this.chatService.setCurrentChat(createdChannel, true);
    } catch (error) {
      console.error('Error creating private channel:', error);
    }
  }

  /**
   * Opens the dialog to add a new channel.
   */
  addNewChannel() {
    const dialogRef = this.dialog.open(DialogAddChannelComponent, {
      disableClose: false,
      panelClass: 'addChannelDialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (!result.isPrivate) {
          this.publicChannels.push(result);
        } else {
          this.privateChannels.push(result);
          this.loadPrivateChannelMembers();
        }
      }
    });
  }

  /**
   * Shows a channel.
   * @param {Channel} channel - The channel to show.
   */
  showChannel(channel: Channel, isPrivate: boolean = false) {
    this.chatService.setCurrentChat(channel, isPrivate);
  }

  /**
   * Sets the selected message to be displayed in the chat component.
   */
  setSelectedMessage() {
    this.chatService.setSelectedChat(true);
  }

  /**
   * Creates a new message.
   */
  newMessage() {
    this.chatService.setSelectedChat(false);
  }
}
