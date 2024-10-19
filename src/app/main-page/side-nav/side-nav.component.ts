import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';
import { ChannelService } from '../../shared/services/channel.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { Channel, NewChannel } from '../../shared/models/channel.model';
import { User, UserWithImageStatus } from '../../shared/models/user.model';
import { SharedChannelService } from '../../shared/services/shared-channel.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  animations: [
    trigger('dropDown', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: 0,
          'padding-top': '0px',
          'padding-right': '0px',
          'padding-bottom': '0px',
          'margin-top': '0px',
          'margin-right': '0px',
          'margin-bottom': '0px',
        })
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: 1,
          'padding-top': '*',
          'padding-right': '*',
          'padding-bottom': '*',
          'margin-top': '*',
          'margin-right': '*',
          'margin-bottom': '*',
        })
      ),
      transition('collapsed => expanded', animate('150ms ease-in')),
      transition('expanded => collapsed', animate('150ms ease-out')),
    ]),
  ],
})
export class SideNavComponent implements OnInit, OnDestroy {
  menuChannelIsDropedDown: boolean = false;
  directMessagesIsDropedDown: boolean = false;

  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  workspaceUsers: UserWithImageStatus[] = [];
  currentUser!: UserWithImageStatus;
  currentChat: { chat: Channel | null; isPrivate: boolean } = { chat: null, isPrivate: false };
  subs = new Subscription();

  constructor(
    private channelService: ChannelService,
    private chatService: ChatService,
    private dialog: MatDialog,
    private authService: AuthService,
    private userService: UserService,
    private sharedChannelService: SharedChannelService
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.subscribeToChannels();
    this.subscribeToPrivateChats();

    // Abonnieren Sie den aktuellen Chat
    const chatSub = this.chatService.currentChat$.subscribe((chatData) => {
      this.currentChat = chatData;
    });
    this.subs.add(chatSub);

  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Loads the current user data and initializes workspace users.
   */
  private loadUserData() {
    const channelSub = this.authService.getUser().subscribe((firebaseUser) => {
      if (firebaseUser) {
        this.userService.getUser(firebaseUser.uid).subscribe((user) => {
          this.currentUser = { ...user, isImageLoaded: false };
          this.loadPublicChannels();
          this.loadPrivateChats();
          this.showWorkspaceUsers();
        });
      }
    });
    this.subs.add(channelSub);
  }

  /**
   * Subscribes to public and private channels.
   */
  private subscribeToChannels() {
    this.sharedChannelService.privateChannels$.subscribe((channels) => {
      this.privateChannels = channels;
    });
  }

  /**
   * Subscribes to private chat creation events.
   */
  private subscribeToPrivateChats() {
    const chatSub = this.chatService.createPrivateChat$.subscribe((user) => {
      if (user) {
        this.findOrCreatePrivateChannelWithUser(user);
        this.setSelectedMessage();
      }
    });
    this.subs.add(chatSub);
  }

  trackByUserId(index: number, user: UserWithImageStatus): string {
    return user.userId;
  }

  /**
   * Loads public channels.
   */
  private loadPublicChannels() {
    this.channelService.getChannels(false).subscribe({
      next: (channels) => {
        this.publicChannels = channels;
        this.sharedChannelService.setPublicChannels(this.publicChannels);
      },
      error: (err) => console.error('Error loading public channels:', err),
    });
  }

  /**
   * Loads private chats.
   */
  private loadPrivateChats() {
    this.channelService.getChannels(true).subscribe({
      next: (channels) => {
        this.privateChannels = channels;
        this.sharedChannelService.setPrivateChannels(this.privateChannels);
      },
      error: (err) => console.error('Error loading private channels:', err),
    });
  }

  /**
   * Shows workspace users.
   * Puts the current user on top of the list.
   */
  private showWorkspaceUsers() {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.workspaceUsers = users.map((user) => ({
          ...user,
          isImageLoaded: false,
        }));
        this.moveCurrentUserToTop();
      },
      error: (err) => console.error('Error loading workspace users:', err),
    });
  }

  /**
   * Moves the current user to the top of the `workspaceUsers` array.
   *
   * This method finds the index of the current user in the `workspaceUsers` array.
   * If the user is found, it removes the user from their current position and
   * inserts them at the beginning of the array.
   *
   * @private
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
   * Handles the event when an image is loaded for a user.
   * Logs the user ID and updates the user's image load status.
   *
   * @param userId - The ID of the user whose image has been loaded.
   */
  onImageLoad(userId: string) {
    // console.log(`Image loaded for user: ${userId}`);
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = true;
    }
  }

  /**
   * Handles the event when an image fails to load for a user.
   * Logs the error and updates the user's image load status.
   *
   * @param userId - The ID of the user whose image failed to load.
   */
  onImageError(userId: string) {
    console.log(`Image failed to load for user: ${userId}`);
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = false;
      user.avatar = 'assets/img/profile/fallback_user.png';
    }
  }

  openMenuChannelDropdown() {
    this.menuChannelIsDropedDown = !this.menuChannelIsDropedDown;
  }

  openDirectMessagesDropdown() {
    this.directMessagesIsDropedDown = !this.directMessagesIsDropedDown;
  }

  /**
   * Finds or creates a private chat channel with the specified user.
   *
   * @param {UserWithImageStatus} user - The user to find or create a private chat channel with.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   *
   * @remarks
   * - If the user is the current user, it will handle it as a self-chat.
   * - If a private chat with the user already exists, it sets the current chat to that private chat.
   * - If no private chat exists, it creates a new channel and sets it as the current chat.
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
   * @param user - The user object containing image and status information.
   * @param isSelfChat - A boolean indicating if the chat is a self-chat.
   * @returns The found private channel or undefined if no matching channel is found.
   */
  findExistingPrivateChannel(
    user: UserWithImageStatus,
    isSelfChat: boolean
  ): Channel | undefined {
    return this.privateChannels.find((channel) =>
      isSelfChat
        ? channel.members.length === 1 &&
        channel.members.includes(this.currentUser.userId)
        : channel.members.includes(this.currentUser.userId) &&
        channel.members.includes(user.userId)
    );
  }

  /**
   * Creates a new channel for a user.
   *
   * @param user - The user for whom the channel is being created, including their image status.
   * @param isSelfChat - A boolean indicating if the channel is for personal notes.
   * @returns A new Channel object with the specified properties.
   */
  private createNewChannel(user: UserWithImageStatus, isSelfChat: boolean): NewChannel {
    return {
      name: isSelfChat ? 'Personal Notes' : `${user.name}`,
      description: isSelfChat ? 'Your personal space' : '',
      createdBy: this.currentUser.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: isSelfChat
        ? [this.currentUser.userId]
        : [this.currentUser.userId, user.userId],
      isPrivate: true,
    };
  }

  /**
   * Adds a new channel and sets it as the current chat.
   *
   * This method performs the following steps:
   * 1. Adds the new channel using the `channelService`.
   * 2. Pushes the created channel to the `privateChannels` array.
   * 3. Sets the created channel as the current chat using the `chatService`.
   * 4. Displays the created channel.
   *
   * @param {Channel} newChannel - The new channel to be added.
   * @returns {Promise<void>} A promise that resolves when the channel is added and set.
   * @throws Will log an error message if there is an issue creating the private channel.
   */
  async addAndSetChannel(newChannel: NewChannel) {
    try {
      const docRef = await this.channelService.addChannel(newChannel);
      const createdChannel: Channel = { ...newChannel, id: docRef.id };
      this.privateChannels.push(createdChannel);
      this.chatService.setCurrentChat(createdChannel, true);
      this.showChannel(createdChannel, true);
    } catch (error) {
      console.error('Error creating private channel:', error);
    }
  }

  /**
   * Opens a dialog to add a new channel.
   * After the dialog is closed, the new channel is added to either the public or private channels list based on its privacy setting.
   *
   * @returns {void}
   */
  addNewChannel() {
    const dialogRef = this.dialog.open(DialogAddChannelComponent, {
      disableClose: false,
      panelClass: 'addChannelDialog',
    });

    dialogRef.afterClosed().subscribe((result: NewChannel | undefined) => {
      if (result) {
        // Hier verwenden wir addAndSetChannel, um den Kanal hinzuzufügen
        this.addAndSetChannel(result);
      }
    });
  }

  /**
   * Displays the specified channel in the chat interface.
   *
   * @param {Channel} channel - The channel to be displayed.
   * @param {boolean} isPrivate - Indicates whether the channel is private.
   * @returns {void}
   */
  showChannel(channel: Channel, isPrivate: boolean) {
    this.chatService.setCurrentChat(channel, isPrivate);
  }

  /**
   * Sets the selected message in the chat service.
   * This method updates the chat service to mark a chat as selected.
   */
  setSelectedMessage() {
    this.chatService.setSelectedChat(true);
  }

  /**
   * Resets the selected chat state to false, indicating that a new message is being created.
   * This method interacts with the chat service to update the chat selection status.
   */
  newMessage() {
    this.chatService.setSelectedChat(false);
  }


  isActiveChannel(channel: Channel): boolean {
    return this.currentChat.isPrivate === false && this.currentChat.chat?.id === channel.id;
  }


  isActiveUser(user: UserWithImageStatus): boolean {
    if (this.currentChat.isPrivate && this.currentChat.chat) {
      return (
        this.currentChat.chat.members.includes(user.userId) &&
        this.currentChat.chat.members.includes(this.currentUser.userId)
      );
    }
    return false;
  }
}
