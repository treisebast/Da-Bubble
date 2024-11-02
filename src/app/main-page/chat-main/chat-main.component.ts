import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogClose, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Firestore, collection, doc } from '@angular/fire/firestore';
import { Timestamp, FieldValue, serverTimestamp } from '@angular/fire/firestore';
import localeDe from '@angular/common/locales/de';
import { firstValueFrom, forkJoin, map, Observable, of, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { Channel } from '../../shared/models/channel.model';
import { Message } from '../../shared/models/message.model';
import { User } from '../../shared/models/user.model';
import { AuthService } from '../../shared/services/auth.service';
import { ChannelService } from '../../shared/services/channel.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { NavigationService } from '../../shared/services/navigation-service.service';
import { ScrollService } from '../../shared/services/scroll-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { UserService } from '../../shared/services/user.service';
import { ChannelInfoPopupComponent } from '../channel-info-popup/channel-info-popup.component';
import { DialogShowMembersComponent } from './dialog-show-members/dialog-show-members.component';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { MessageComponent } from '../message/message.component';
import { MentionDropdownComponent } from './mention-dropdown/mention-dropdown.component';
import { ChannelDropdownComponent } from './channel-dropdown/channel-dropdown.component';
import { ProfilComponent } from '../profil/profil.component';
import { WelcomeChannelComponent } from './welcome-channel/welcome-channel.component';
import { sortMessagesByTimestamp, isNewDay as helperIsNewDay, convertTimestampToDate } from './chat-main.helper';
import { handleFileAction } from './file-helper';
import { setErrorMessage, clearErrorMessage } from './error-helper';
import { loadMetadataForMessage } from './message-helper';
import { handleTextareaInput, handleTextareaKeydown, InputHandlerState, KeydownHandlerCallbacks, KeydownHandlerState } from './chat-keydown.helper';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MessageComponent, MatProgressSpinnerModule, ChannelInfoPopupComponent, ProfilComponent, ImageOverlayComponent, WelcomeChannelComponent, PickerComponent, MatDialogModule, MatDialogClose, MentionDropdownComponent, ChannelDropdownComponent],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss'],
})
export class ChatMainComponent implements OnInit, AfterViewInit, OnDestroy {
  showMentionDropdown = false;
  mentionSearchTerm = '';
  mentionStartPosition = -1;
  showChannelDropdown = false;
  channelSearchTerm = '';
  channelMentionStartPosition = -1;
  isLoading: boolean = false;
  hoverStates: { [key: string]: boolean } = {};

  showEmojiPicker = false;
  currentChat: any = null;
  selectedChat: boolean = false;
  isCurrentChatPrivate: boolean = false;
  preventImmediateClose: boolean = true;
  selectedChannel: Channel | null = null;
  currentThreadData: any;
  isProfileOpen: boolean = false;
  currentUserId = '';
  currentUserName = '';
  clickedUser: User | null = null;
  clickedUserName: string = '';
  otherUser: User | null = null;
  userProfiles: { [key: string]: any } = {};
  usersOfSelectedChannel: User[] = [];
  messages$: Observable<Message[]> = new Observable<Message[]>();
  messages: Message[] = [];
  newMessageText = '';
  errorMessage: string | null = null;
  errorTimeout: any;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  attachmentUrl: string | null = null;
  overlayImageUrl: string | null = null;
  privateChannels: Channel[] = [];
  publicChannels: Channel[] = [];
  filteredChannels: Channel[] = [];
  filteredPublicChannels: Channel[] = [];
  showEmojiMart = false;
  private usersOfSelectedChannelSubscription: Subscription | null = null;
  private clickedUserSubscription: Subscription | null = null;
  private previousChatId: string | null = null;
  private destroy$ = new Subject<void>();
  private keydownState: KeydownHandlerState = {
    showMentionDropdown: this.showMentionDropdown,
    mentionDropdownComponent: this.mentionDropdownComponent,
    showChannelDropdown: this.showChannelDropdown,
    channelDropdownComponent: this.channelDropdownComponent
  };
  private inputState: InputHandlerState = {
    showMentionDropdown: this.showMentionDropdown,
    mentionSearchTerm: this.mentionSearchTerm,
    showChannelDropdown: this.showChannelDropdown,
    channelSearchTerm: this.channelSearchTerm,
    mentionStartPosition: this.mentionStartPosition,
    channelMentionStartPosition: this.channelMentionStartPosition
  };
  private keydownCallbacks: KeydownHandlerCallbacks = {
    onUserSelected: this.onUserSelected.bind(this),
    onChannelSelected: this.onChannelSelected.bind(this),
    sendMessage: this.sendMessage.bind(this)
  };

  @Output() openThreadEvent = new EventEmitter<void>();
  @ViewChild('chatContainer', { static: false }) private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('mentionDropdown') mentionDropdownComponent?: MentionDropdownComponent;
  @ViewChild('channelDropdown') channelDropdownComponent?: ChannelDropdownComponent;
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;

  private subscriptions = new Subscription();
  private navigationSubscription: Subscription | null = null;
  private profileSubscription: Subscription | null = null;
  private boundCloseEmojiPicker = this.closeEmojiPickerOnOutsideClick.bind(this);
  constructor(private cd: ChangeDetectorRef, private router: Router, private activatedRoute: ActivatedRoute, private scrollService: ScrollService, private chatService: ChatService, private authService: AuthService, private userService: UserService, private threadService: ThreadService, private firebaseStorageService: FirebaseStorageService, private firestore: Firestore, public dialog: MatDialog, private channelService: ChannelService, private navigationService: NavigationService) {
    registerLocaleData(localeDe);
  }

  /**
 * Initializes component, subscribes to various states, and sets loading.
 */
  ngOnInit() {
    this.setLoadingState(true);
    this.initializeUser();
    this.subscribeToRouteParams();
    this.subscribeToCurrentChat();
    this.subscribeToLoadingState();
    this.subscribeToMessages();
    this.subscribeToSelectedMessage();
    this.setLoadingState(false);
  }

  /**
   * Unsubscribes from all active subscriptions on component destruction.
   */
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
      this.profileSubscription = null;
    }
    if (this.clickedUserSubscription) {
      this.clickedUserSubscription.unsubscribe();
      this.clickedUserSubscription = null;
    }
    document.addEventListener('click', this.boundCloseEmojiPicker);
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }

  /**
   * Scrolls chat to bottom and sets up click listener after view init.
   */
  ngAfterViewInit() {
    if (this.chatContainer) {
      this.scrollService.scrollToBottomOfMainChat(this.chatContainer);
    }
    document.addEventListener('click', this.boundCloseEmojiPicker);
  }


  /**
   * Subscribes to private and public channels, updating local lists.
   */
  private subscribeToChannels(): void {
    if (!this.currentUserId) return;
    const privateChannelsSub = this.channelService
      .getChannelsForUser(this.currentUserId, true)
      .subscribe((channels) => {
        this.privateChannels = channels;
      });
    this.subscriptions.add(privateChannelsSub);
    const publicChannelsSub = this.channelService
      .getChannelsForUser(this.currentUserId, false)
      .subscribe((channels) => {
        this.publicChannels = channels;
      });
    this.subscriptions.add(publicChannelsSub);
  }

  /**
   * Subscribes to the selected message, handling it if a message is chosen.
   */
  private subscribeToSelectedMessage(): void {
    this.navigationSubscription = this.navigationService.selectedMessage$.subscribe(async (message) => {
      if (message) {
        await this.handleSelectedMessage(message);
      }
    });
    this.subscriptions.add(this.navigationSubscription);
  }

  /**
   * Manages user initialization and sets user details upon authentication.
   */
  private initializeUser(): void {
    const authSub = this.authService.getUser().subscribe((user) => {
      if (user) {
        this.setUserDetails(user);
        this.subscribeToChannels();
      }
    });
    this.subscriptions.add(authSub);
  }

  /**
   * Sets user details for current session using provided user object.
   */
  private setUserDetails(user: any): void {
    this.currentUserId = user.uid;
    this.currentUserName = user.displayName || '';
  }

  /**
   * Subscribes to current chat updates and fetches channel details if available.
   */
  private subscribeToCurrentChat(): void {
    this.chatService.currentChat$
      .pipe(
        switchMap(({ chat, isPrivate }) =>
          chat && chat.id
            ? this.channelService.getChannel(chat.id, isPrivate).pipe(
              map(updatedChat => ({ chat: updatedChat, isPrivate }))
            )
            : of({ chat: null, isPrivate: false })
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(({ chat, isPrivate }) => {
        this.currentChat = chat;
        this.isCurrentChatPrivate = isPrivate;
        this.selectedChat = !!chat;
        this.previousChatId = chat?.id || null;

        if (chat) {
          this.getUsersOfSelectedChannel(chat);
          this.otherUser = this.getOtherUserInPrivateChat(chat);
          this.getUserNameById(chat);
        }
        this.cd.detectChanges();
        this.focusTextarea();
      });
  }

  /**
 * Subscribes to chat messages and binds response and error handling.
 */
  private subscribeToMessages(): void {
    const messagesSub = this.chatService.messages$.subscribe({
      next: this.handleMessagesResponse.bind(this),
      error: this.handleMessagesError.bind(this),
    });
    this.subscriptions.add(messagesSub);
  }


  /**
 * Handles message updates, sorting, and metadata loading for display.
 */
  private handleMessagesResponse(messages: Message[]): void {
    if (!messages || messages.length === 0) {
      this.messages = [];
      this.setLoadingState(false);
      return;
    }

    const validMessages = messages.filter((message) => message.timestamp);
    const sortedMessages = sortMessagesByTimestamp(validMessages);

    const metadataRequests: Observable<Message>[] = sortedMessages.map(
      (message) => loadMetadataForMessage(message, this.firebaseStorageService)
    );

    forkJoin(metadataRequests).subscribe((messagesWithMetadata: Message[]) => {
      this.messages = messagesWithMetadata;
      this.loadUserProfiles(messagesWithMetadata);
      this.setLoadingState(false);

      if (this.messages && this.userProfiles && this.chatContainer) {
        this.scrollService.scrollToBottomOfMainChat(this.chatContainer);
      }
    });
  }

  /**
 * Subscribes to loading state updates in the chat service.
 */
  private subscribeToLoadingState(): void {
    const loadingSub = this.chatService.loadingState$.subscribe((isLoading) => {
      this.isLoading = isLoading;
    });
    this.subscriptions.add(loadingSub);
  }


  /**
 * Fetches users of the selected channel, updating the user list.
 */
  private getUsersOfSelectedChannel(chat: Channel) {
    if (this.usersOfSelectedChannelSubscription) {
      this.usersOfSelectedChannelSubscription.unsubscribe();
      this.usersOfSelectedChannelSubscription = null;
    }

    if (chat && chat.members && chat.members.length > 0) {
      this.usersOfSelectedChannelSubscription = this.userService
        .getUsersByIds(chat.members)
        .subscribe((users) => {
          this.usersOfSelectedChannel = users;
        });
      this.subscriptions.add(this.usersOfSelectedChannelSubscription);
    }
  }


  /**
 * Identifies other user in a private chat by excluding current user ID.
 */
  private getOtherUserInPrivateChat(chat: Channel): User | null {
    if (chat && chat.members && chat.members.length > 1) {
      return (
        this.usersOfSelectedChannel.find(
          (user) => user.userId !== this.currentUserId
        ) || null
      );
    }
    return null;
  }


  /**
 * Loads user profiles for each unique sender in the provided messages.
 */
  private loadUserProfiles(messages: Message[]) {
    const userIds = [...new Set(messages.map((message) => message.senderId))];
    userIds.forEach((userId) => {
      if (!this.userProfiles[userId]) {
        const userSub = this.userService.getUser(userId).subscribe((user: User) => {
          this.userProfiles[userId] = {
            name: user.name,
            avatar: user.avatar,
            status: user.status === 'online',
          };
        });
        this.subscriptions.add(userSub);
      }
    });
  }


  /**
 * Prevents sending an empty message or without chat selection.
 */
  sendMessage(event?: Event) {
    event?.preventDefault();
    if (!this.isChatSelected() || this.isMessageEmpty()) {
      return;
    }

    this.selectedFile
      ? this.uploadAttachmentAndSendMessage()
      : this.createAndSendMessage();
  }


  /**
 * Uploads selected file to storage and appends it to the message content.
 */
  private async uploadAttachmentAndSendMessage(): Promise<void> {
    const autoId = doc(collection(this.firestore, 'dummy')).id;
    const filePath = `chat-files/${this.currentChat.id}/${autoId}_${this.selectedFile?.name}`;
    const downloadUrl = await firstValueFrom(
      this.firebaseStorageService.uploadFile(this.selectedFile!, filePath)
    );
    this.attachmentUrl = downloadUrl;
    await this.createAndSendMessage();
  }

  /**
 * Builds and sends a new message, then resets input and scrolls chat.
 */
  private createAndSendMessage(): void {
    const newMessage: Message = this.buildNewMessage();
    this.isLoading = false;

    this.chatService
      .addMessage(newMessage)
      .then(() => {
        this.clearMessageInput();
        this.scrollService.scrollToBottomOfMainChat(this.chatContainer);
        this.setLoadingState(false);
      });
  }


  /**
 * Creates a new message object with current chat and user data.
 */
  private buildNewMessage(): Message {
    return {
      content: this.newMessageText,
      content_lowercase: this.newMessageText.toLowerCase(),
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      isPrivateChat: this.isCurrentChatPrivate,
      chatId: this.currentChat.id,
      attachments: this.attachmentUrl ? [this.attachmentUrl] : [],
    };
  }

  /**
 * Checks if a chat is currently selected for messaging.
 */
  private isChatSelected(): boolean {
    return this.currentChat && this.currentChat.id;
  }

  /**
 * Checks if the message input is empty and no file is attached.
 */
  private isMessageEmpty(): boolean {
    return this.newMessageText.trim() === '' && !this.selectedFile;
  }

  /**
 * Resets input fields after message is sent, readying for new input.
 */
  private clearMessageInput(): void {
    this.newMessageText = '';
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.previewUrl = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
 * Toggles loading state, updating the chat service state as well.
 */
  private setLoadingState(isLoading: boolean) {
    this.isLoading = isLoading;
    this.chatService.setLoadingState(isLoading);
  }

  /**
 * Tracks user by user ID for efficient list rendering.
 */
  trackByUserId(index: number, user: User): string {
    return user.userId ? user.userId : index.toString();
  }

  /**
   * Opens a thread based on message ID and fetches thread details.
   */
  async openThread(message: Message) {
    if (!message || !message.id) {
      return;
    }
    this.openThreadEvent.emit();
    this.threadService
      .getThreads(this.currentChat.id, message.id)
      .subscribe((currentThread) => {
        this.currentThreadData = currentThread;
        this.threadService.setCurrentThread(currentThread);

        if (message.id) {
          this.threadService.currentMessageId = message.id;
          this.threadService.setCurrentMessageToOpen(message);
        }
      });
  }

  /**
   * Retrieves and returns the name of the user by their sender ID.
   */
  getUserName(senderId: string): string {
    return this.userProfiles[senderId]?.name || 'Unknown User';
  }

  /**
 * Shows popup with list of users in a selected chat channel.
 */
  showUserListPopup(currentChat: Channel, popupState: 'listView' | 'addUsers'): void {
    const dialogRef = this.dialog.open(DialogShowMembersComponent, {
      data: {
        members: this.usersOfSelectedChannel,
        channel: currentChat,
        popupState: popupState,
      },
      hasBackdrop: true,
      backdropClass: 'backdropVisible',
    });
    let alreadyOpen = false;
    dialogRef.afterClosed().subscribe((result) => {
      if (result && !alreadyOpen) {
        this.toggleProfilePopup(result.userId);
        alreadyOpen = true;
      }
    });
  }

  /**
   * Toggles the profile popup for a selected user or closes it.
   */
  toggleProfilePopup(userId?: string): void {
    if (userId && !this.isProfileOpen) {
      this.profileSubscription = this.userService.getUser(userId).subscribe((user: User) => {
        this.clickedUser = user;
        this.isProfileOpen = true;
      });
    } else if (this.isProfileOpen) {
      this.isProfileOpen = false;
      if (this.profileSubscription) {
        this.profileSubscription.unsubscribe();
        this.profileSubscription = null;
      }
      this.clickedUser = null;
    }
  }

  /**
 * Opens the channel information popup for the current chat.
 */
  openChannelInfoPopup() {
    this.selectedChannel = this.currentChat as Channel;
  }

  /**
 * Closes the currently open channel information popup.
 */
  closeChannelInfoPopup() {
    this.selectedChannel = null;
  }

  /**
 * Handles click on channel name, opening relevant popup or profile.
 */
  onHeaderChannelNameClick(event: Event) {
    event.stopPropagation();
    if (this.isCurrentChatPrivate && this.clickedUser?.userId) {
      this.toggleProfilePopup(this.clickedUser.userId);
    } else {
      this.openChannelInfoPopup();
    }
  }

  /**
 * Opens file dialog for selecting files to attach to a message.
 */
  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  /**
 * Handles file input, validates and prepares for preview or attachment.
 */
  async handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.clearErrorMessage();

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const result = await handleFileAction(file);

      if (result.errorMessage) {
        this.setErrorMessage(result.errorMessage);
        return;
      }

      this.previewUrl = result.previewUrl ?? null;
      this.attachmentUrl = null;
      this.selectedFile = result.file ?? null;
      this.clearErrorMessage();
    }
  }

  /**
 * Handles message response error, resetting loading state.
 */
  private handleMessagesError(): void {
    this.setLoadingState(false);
  }

  /**
 * Sets error message for file or message handling errors.
 */
  setErrorMessage(message: string): void {
    setErrorMessage(this, message);
  }

  /**
 * Clears the current error message, if any is set.
 */
  clearErrorMessage(): void {
    clearErrorMessage(this);
  }

  async getUserNameById(currentChat: any) {
    this.unsubscribeClickedUser();

    if (this.isGroupChat(currentChat)) {
      await this.handleGroupChat(currentChat);
    } else {
      this.handleSingleUserChat();
    }
  }

  /**
 * Unsubscribes clicked user to prevent memory leaks in session.
 */
  private unsubscribeClickedUser() {
    if (this.clickedUserSubscription) {
      this.clickedUserSubscription.unsubscribe();
      this.clickedUserSubscription = null;
    }
  }

  /**
 * Checks if the current chat is a group by validating members count.
 */
  private isGroupChat(currentChat: any): boolean {
    return currentChat?.members?.length > 1;
  }

  /**
 * Handles the chat if it is a group, setting necessary user details.
 */
  private async handleGroupChat(currentChat: any) {
    const otherUserId = this.getOtherUserOfMembers(currentChat.members);
    if (!otherUserId) {
      return;
    }
    const userName = await this.userService.getUserNameById(otherUserId);
    this.clickedUserName = userName || 'Unbekannter Benutzer';
    this.clickedUserSubscription = this.userService.getUser(otherUserId).subscribe((user: User | undefined) => {
      if (user && this.currentChat?.members.includes(user.userId)) {
        this.clickedUser = user;
      }
    });
  }

  /**
 * Manages a single-user chat, setting user name as current user.
 */
  private handleSingleUserChat() {
    this.clickedUserName = `${this.currentUserName} (Du)`;
    this.clickedUserSubscription = this.userService.getUser(this.currentUserId).subscribe((user: User) => {
      this.clickedUser = user;
    });
  }

  /**
   * Identifies other user from chat members excluding current user ID.
   */
  getOtherUserOfMembers(currentChatMembers: string[]): string | null {
    for (const member of currentChatMembers) {
      if (member !== this.currentUserId) {
        return member;
      }
    }
    return null;
  }

  /**
 * Clears selected file preview from the input field.
 */
  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.fileInput.nativeElement.value = '';
  }

  /**
 * Opens an overlay with the provided image URL for viewing.
 */
  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  /**
 * Closes the currently opened image overlay.
 */
  closeOverlay() {
    this.overlayImageUrl = null;
  }

  /**
 * Toggles emoji picker visibility in the chat input.
 */
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
    if (this.showEmojiPicker) {
      setTimeout(() => {
        this.preventImmediateClose = false;
      }, 100);
    }
  }

  /**
 * Closes emoji picker if a click occurs outside its bounds.
 */
  closeEmojiPickerOnOutsideClick(event: MouseEvent) {
    const pickerElement = document.querySelector('emoji-mart');
    const targetElement = event.target as Node;
    if (
      !this.preventImmediateClose &&
      pickerElement &&
      !pickerElement.contains(targetElement)
    ) {
      this.showEmojiPicker = false;
    }
    this.preventImmediateClose = true;
  }

  /**
 * Adds selected emoji to the message input and refocuses textarea.
 */
  addEmoji(event: any) {
    this.newMessageText += event.emoji.native;
    this.showEmojiPicker = false;
    this.focusTextarea();
  }

  /**
 * Focuses on the message textarea for continued input.
 */
  focusTextarea() {
    if (this.messageTextarea && this.messageTextarea.nativeElement) {
      this.messageTextarea.nativeElement.focus();
    }
  }

  /**
   * Tracks messages by message ID for efficient rendering in lists.
   */
  trackByMessageId(index: number, message: Message): string {
    return message.id ? message.id : index.toString();
  }

  /**
 * Handles input events in the textarea, updating input state.
 */
  onTextareaInput(event: Event) {
    this.inputState = {
      showMentionDropdown: this.showMentionDropdown,
      mentionSearchTerm: this.mentionSearchTerm,
      showChannelDropdown: this.showChannelDropdown,
      channelSearchTerm: this.channelSearchTerm,
      mentionStartPosition: this.mentionStartPosition,
      channelMentionStartPosition: this.channelMentionStartPosition
    };
    handleTextareaInput(event, this.inputState);
    this.showMentionDropdown = this.inputState.showMentionDropdown;
    this.mentionSearchTerm = this.inputState.mentionSearchTerm;
    this.showChannelDropdown = this.inputState.showChannelDropdown;
    this.channelSearchTerm = this.inputState.channelSearchTerm;
    this.mentionStartPosition = this.inputState.mentionStartPosition;
    this.channelMentionStartPosition = this.inputState.channelMentionStartPosition;
  }


  /**
   * Inserts selected user mention into message and updates dropdown state.
   */
  onUserSelected(user: User) {
    const textarea = document.querySelector(
      '.messageBox textarea'
    ) as HTMLTextAreaElement;
    if (textarea) {
      const cursorPosition = textarea.selectionStart;
      const value = textarea.value;
      const beforeMention = value.substring(0, this.mentionStartPosition);
      const afterCursor = value.substring(cursorPosition);
      const newValue = beforeMention + '@' + user.name + ' ' + afterCursor;
      this.newMessageText = newValue;
      setTimeout(() => {
        const newCursorPosition = (beforeMention + '@' + user.name + ' ')
          .length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
        textarea.focus();
      }, 0);

      this.showMentionDropdown = false;
      this.mentionSearchTerm = '';
    }
  }

  /**
 * Manages keydown events in the textarea, triggering appropriate actions.
 */
  onTextareaKeydown(event: KeyboardEvent) {
    this.keydownState = {
      showMentionDropdown: this.showMentionDropdown,
      mentionDropdownComponent: this.mentionDropdownComponent,
      showChannelDropdown: this.showChannelDropdown,
      channelDropdownComponent: this.channelDropdownComponent
    };
    handleTextareaKeydown(event, this.keydownState, this.keydownCallbacks);
    this.showMentionDropdown = this.keydownState.showMentionDropdown;
    this.showChannelDropdown = this.keydownState.showChannelDropdown;
  }

  /**
 * Closes mention dropdown if clicking outside of textarea and dropdown.
 */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.mention-dropdown') &&
      !target.closest('.messageBox textarea')
    ) {
      this.showMentionDropdown = false;
    }
  }

  /**
 * Sets the current chat based on selected channel from dropdown.
 */
  onChannelSelected(channel: Channel) {
    this.router.navigate(['/main', 'chat', channel.id]);
    this.chatService.setCurrentChat(channel, false);
    this.newMessageText = '';
    this.showChannelDropdown = false;
    this.channelSearchTerm = '';
  }

  /**
 * Inserts mention at current cursor position and opens mention dropdown.
 */
  insertAtAndOpenMention() {
    const textarea = this.messageTextarea.nativeElement;
    const cursorPosition = textarea.selectionStart || 0;
    const value = this.newMessageText;
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    const newValue = `${beforeCursor}@${afterCursor}`;
    this.newMessageText = newValue;

    setTimeout(() => {
      const newCursorPosition = cursorPosition + 1;
      textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
      textarea.focus();
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);
    }, 0);
  }

  /**
 * Converts a Firebase timestamp to a Date object.
 */
  convertToDate(timestamp: Timestamp | FieldValue): Date {
    return convertTimestampToDate(timestamp);
  }

  /**
 * Determines if current message is a new day compared to the previous.
 */
  isNewDay(currentMessage: Message, index: number): boolean {
    if (index === 0) return true;
    const previousMessage = this.messages[index - 1];
    return helperIsNewDay(currentMessage, previousMessage);
  }

  /**
 * Loads a chat by its ID and sets it as the current chat.
 */
  public async loadChatById(chatId: string): Promise<void> {
    try {
      const channel = await firstValueFrom(this.channelService.getChannel(chatId, false));
      let isPrivate = false;
      if (!channel) {
        const privateChannel = await firstValueFrom(this.channelService.getChannel(chatId, true));
        if (privateChannel) {
          this.chatService.setCurrentChat(privateChannel, true);
          isPrivate = true;
        } else {
          this.chatService.setCurrentChat(null, false);
          return;
        }
      } else {
        this.chatService.setCurrentChat(channel, false);
      }
    } catch (error) {
      this.chatService.setCurrentChat(null, false);
    }
  }

  /**
 * Handles a selected message by loading the associated chat if necessary and scrolling to the message.
 */
  private async handleSelectedMessage(message: Message) {
    const chatId = message.chatId;

    if (chatId) {
      if (
        this.currentChat?.id !== chatId ||
        this.isCurrentChatPrivate !== message.isPrivateChat
      ) {
        await this.loadChatById(chatId);
      }
      if (message.id) {
        this.scrollService.scrollToMessage(message.id);
      }
    }
  }

  /**
   * Subscribes to the route parameters to capture the current chat ID and load the chat.
   */
  private subscribeToRouteParams(): void {
    this.activatedRoute.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const chatId = params.get('chatId');
        if (chatId) {
          this.loadChatById(chatId);
        }
      });
  }
}