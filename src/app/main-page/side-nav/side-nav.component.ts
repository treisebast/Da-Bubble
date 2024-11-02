import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';
import { ChannelService } from '../../shared/services/channel.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { Channel, NewChannel } from '../../shared/models/channel.model';
import { UserWithImageStatus } from '../../shared/models/user.model';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Observable, Subject, Subscription, combineLatest, of } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';

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
  @Output() serverNameClicked = new EventEmitter<void>();
  @Output() channelSelected = new EventEmitter<void>();

  menuChannelIsDropedDown: boolean = false;
  directMessagesIsDropedDown: boolean = false;
  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  workspaceUsers: UserWithImageStatus[] = [];
  currentUser!: UserWithImageStatus;
  currentChat: { chat: Channel | null; isPrivate: boolean } = { chat: null, isPrivate: false };
  subs = new Subscription();
  private destroy$ = new Subject<void>();

  constructor(
    private channelService: ChannelService,
    private chatService: ChatService,
    private dialog: MatDialog,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) { }

  //---------------------------------------- Lifecycle Hooks ----------------------------------------

  ngOnInit() {
    const user$ = this.authService.getUser().pipe(
      filter(firebaseUser => !!firebaseUser && !!firebaseUser.uid),
      switchMap(firebaseUser => this.userService.getUser(firebaseUser!.uid)),
      filter(user => !!user && !!user.userId),
      map(user => {
        this.currentUser = { ...user, isImageLoaded: false };
        return this.currentUser;
      })
    );

    const publicChannels$ = user$.pipe(
      switchMap(user => this.channelService.getChannelsForUser(user.userId, false))
    );

    const privateChannels$ = user$.pipe(
      switchMap(user => this.channelService.getChannelsForUser(user.userId, true))
    );

    const channelsSub = combineLatest([publicChannels$, privateChannels$]).pipe(
      switchMap(([publicChannels, privateChannels]) => {
        this.publicChannels = publicChannels;
        this.privateChannels = privateChannels;
        return this.showWorkspaceUsers();
      })
    ).subscribe();

    this.subs.add(channelsSub);

    const chatSub = this.chatService.currentChat$
    .pipe(takeUntil(this.destroy$))
    .subscribe((chatData) => {
      this.currentChat = chatData;
    });
    this.subs.add(chatSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  //---------------------------------------- Initialization Methods ----------------------------------------

  /**
   * Loads the list of workspace users from the UserService and updates the workspace users.
   * Also removes invalid users and updates channels accordingly.
   */
  private showWorkspaceUsers(): Observable<void> {
    return this.userService.getUsers().pipe(
      takeUntil(this.destroy$),
      switchMap((users) => {
        const validUsers = users.filter(user => !!user && !!user.userId) as UserWithImageStatus[];
        this.workspaceUsers = validUsers;
        return this.workspaceUsers;
      }),
      map(() => { this.moveCurrentUserToTop(); })
    );
  }


  /**
   * Moves the current user to the top of the `workspaceUsers` array.
   */
  private moveCurrentUserToTop() {
    const currentUserIndex = this.workspaceUsers.findIndex((user) => user.userId === this.currentUser.userId);
    if (currentUserIndex !== -1) {
      const currentUser = this.workspaceUsers.splice(currentUserIndex, 1)[0];
      this.workspaceUsers.unshift(currentUser);
    }
  }

  //---------------------------------------- User Image Handlers ----------------------------------------

  /**
   * Handles the event when a user's image is successfully loaded.
   * @param userId - The ID of the user whose image was loaded
   */
  onImageLoad(userId: string) {
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = true;
    }
  }

  /**
   * Handles the event when a user's image fails to load.
   * Sets a fallback avatar image.
   * @param userId - The ID of the user whose image failed to load
   */
  onImageError(userId: string) {
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = false;
      user.avatar = 'assets/img/profile/fallback_user.png';
    }
  }

  //---------------------------------------- Dropdown Methods ----------------------------------------

  /**
   * Toggles the dropdown menu for channels.
   */
  openMenuChannelDropdown() {
    this.menuChannelIsDropedDown = !this.menuChannelIsDropedDown;
  }

  /**
   * Toggles the dropdown menu for direct messages.
   */
  openDirectMessagesDropdown() {
    this.directMessagesIsDropedDown = !this.directMessagesIsDropedDown;
  }

  //---------------------------------------- Channel Management ----------------------------------------

  /**
   * Finds or creates a private chat channel with the specified user.
   * @param user - The user to chat with
   */
  async findOrCreatePrivateChannelWithUser(user: UserWithImageStatus) {
    const isSelfChat = user.userId === this.currentUser.userId;
    const privateChat = this.findExistingPrivateChannel(user, isSelfChat);
    if (!privateChat) {
      const newChannel = this.createNewChannel(user, isSelfChat);
      await this.addAndSetChannel(newChannel);
    } else {
      this.chatService.setCurrentChat(privateChat, true);
      this.router.navigate(['/main/chat', privateChat.id]);
    }
  }

  /**
   * Finds an existing private channel based on the provided user and chat type.
   * @param user - The user to find a private channel with
   * @param isSelfChat - Flag indicating if the chat is a self-chat
   * @returns The existing private channel or `undefined` if not found
   */
  private findExistingPrivateChannel(
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
   * @param user - The user to create a channel for
   * @param isSelfChat - Flag indicating if the channel is a self-chat
   * @returns The new channel object
   */
  private createNewChannel(user: UserWithImageStatus, isSelfChat: boolean): NewChannel {
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
   * @param newChannel - The new channel to add
   */
  async addAndSetChannel(newChannel: NewChannel) {
    try {
      const docRef = await this.channelService.addChannel(newChannel);
      const createdChannel: Channel = { ...newChannel, id: docRef.id };
      this.chatService.setCurrentChat(createdChannel, true);
      this.showChannel(createdChannel, true);
    } catch (error) {
    }
  }

  /**
   * Opens a dialog to add a new channel.
   */
  addNewChannel() {
    const dialogRef = this.dialog.open(DialogAddChannelComponent, {
      disableClose: false,
      panelClass: 'addChannelDialog',
    });

    dialogRef.afterClosed().subscribe((result: NewChannel | undefined) => {
      if (result) {
        this.addAndSetChannel(result);
      }
    });
  }

  /**
   * Displays the specified channel in the chat interface.
   * @param channel - The channel to display
   * @param isPrivate - Flag indicating if the channel is private
   */
  showChannel(channel: Channel, isPrivate: boolean) {
    this.chatService.setCurrentChat(channel, isPrivate);
    this.channelSelected.emit();
    this.router.navigate(['/main/chat', channel.id]);
  }

  //---------------------------------------- Chat Management ----------------------------------------

  /**
   * Sets the selected message in the ChatService.
   */
  setSelectedMessage() {
    this.chatService.setSelectedChat(true);
  }

  /**
   * Resets the selected chat state and signals that a new message is being created.
   */
  newMessage() {
    this.chatService.setSelectedChat(false);
  }

  //---------------------------------------- Utility Methods ----------------------------------------

  /**
   * Tracks users by their unique user ID for efficient rendering.
   * @param index - The index of the user in the list
   * @param user - The user object
   * @returns The unique user ID as a string
   */
  trackByUserId(index: number, user: UserWithImageStatus): string {
    return user.userId;
  }

  /**
   * Tracks channels by their unique ID.
   * @param index - The index of the channel in the list
   * @param channel - The channel object
   * @returns The unique channel ID as a string
   */
  trackByChannelId(index: number, channel: Channel): string {
    return channel.id;
  }

  /**
   * Determines if the given channel is the active channel.
   * @param channel - The channel to check
   * @returns `true` if the channel is active, otherwise `false`
   */
  isActiveChannel(channel: Channel): boolean {
    return this.currentChat.isPrivate === false && this.currentChat.chat?.id === channel.id;
  }

  /**
   * Determines if the given user is an active participant in the current chat.
   * @param user - The user to check
   * @returns `true` if the user is active in the current chat, otherwise `false`
   */
  isActiveUser(user: UserWithImageStatus): boolean {
    if (this.currentChat.isPrivate && this.currentChat.chat) {
      const members = this.currentChat.chat.members;
      if (members.length === 1) {
        return members[0] === this.currentUser.userId && user.userId === this.currentUser.userId;
      } else if (members.length === 2) {
        const isCurrentUserInMembers = members.includes(this.currentUser.userId);
        const isUserInMembers = members.includes(user.userId);
        return isCurrentUserInMembers && isUserInMembers && user.userId !== this.currentUser.userId;
      }
    }
    return false;
  }

  //---------------------------------------- Event Handlers ----------------------------------------

  /**
   * Emits an event when the server name is clicked.
   */
  onServerNameClick() {
    this.serverNameClicked.emit();
  }
}
