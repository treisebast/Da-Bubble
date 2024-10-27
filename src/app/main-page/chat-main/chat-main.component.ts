import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../shared/models/channel.model';
import { Message } from '../../shared/models/message.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { AuthService } from '../../shared/services/auth.service';
import { Timestamp, FieldValue, serverTimestamp } from '@angular/fire/firestore';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MessageComponent } from '../message/message.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import localeDe from '@angular/common/locales/de';
import { ChannelInfoPopupComponent } from '../channel-info-popup/channel-info-popup.component';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { Firestore, collection, doc } from '@angular/fire/firestore';
import { firstValueFrom, forkJoin, map, Observable, of, Subscription, switchMap } from 'rxjs';
import { ProfilComponent } from '../profil/profil.component';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { MatDialog, MatDialogClose, MatDialogModule } from '@angular/material/dialog';
import { DialogShowMembersComponent } from './dialog-show-members/dialog-show-members.component';
import { ChannelService } from '../../shared/services/channel.service';
import { MentionDropdownComponent } from './mention-dropdown/mention-dropdown.component';
import { ChannelDropdownComponent } from './channel-dropdown/channel-dropdown.component';
import { NavigationService } from '../../shared/services/navigation-service.service';
import { WelcomeChannelComponent } from './welcome-channel/welcome-channel.component';
import { ScrollService } from '../../shared/services/scroll-service.service';
import { sortMessagesByTimestamp, isNewDay as helperIsNewDay, convertTimestampToDate } from './chat-main.helper';
import { isValidFile, createFilePreview, FileValidationResult } from './file-helper';
import { setErrorMessage, clearErrorMessage } from './error-helper';
import { loadMetadataForMessage } from './message-helper';
import { handleTextareaInput, handleTextareaKeydown, InputHandlerState, KeydownHandlerCallbacks, KeydownHandlerState } from './chat-keydown.helper';

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
  private usersOfSelectedChannelSubscription: Subscription | null = null;
  isCurrentChatPrivate: boolean = false;
  preventImmediateClose: boolean = true;

  selectedChannel: Channel | null = null;
  overlayImageUrl: string | null = null;
  userProfiles: { [key: string]: any } = {};
  usersOfSelectedChannel: User[] = [];
  currentUserId = '';
  currentUserName = '';
  clickedUser: User | null = null;
  clickedUserName: string = '';
  private clickedUserSubscription: Subscription | null = null;
  otherUser: User | null = null;

  messages$: Observable<Message[]> = new Observable<Message[]>();
  messages: Message[] = [];
  newMessageText = '';
  errorMessage: string | null = null;
  errorTimeout: any;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  attachmentUrl: string | null = null;

  isProfileOpen: boolean = false;

  privateChannels: Channel[] = [];
  publicChannels: Channel[] = [];
  filteredChannels: Channel[] = [];
  filteredPublicChannels: Channel[] = [];
  currentThreadData: any;
  private previousChatId: string | null = null;

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

  @ViewChild('chatContainer', { static: false })
  private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('mentionDropdown')
  mentionDropdownComponent?: MentionDropdownComponent;
  @ViewChild('channelDropdown')
  channelDropdownComponent?: ChannelDropdownComponent;
  @ViewChild('messageTextarea')
  messageTextarea!: ElementRef<HTMLTextAreaElement>;

  private subscriptions = new Subscription();
  private navigationSubscription: Subscription | null = null;
  private profileSubscription: Subscription | null = null;

  constructor(
    private scrollService: ScrollService,
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private threadService: ThreadService,
    private firebaseStorageService: FirebaseStorageService,
    private firestore: Firestore,
    public dialog: MatDialog,
    private channelService: ChannelService,
    private navigationService: NavigationService
  ) {
    registerLocaleData(localeDe);
  }

  ngOnInit() {
    this.setLoadingState(true);
    this.initializeUser();
    this.subscribeToCurrentChat();
    this.subscribeToLoadingState();
    this.subscribeToMessages();
    this.subscribeToChannels();
    this.subscribeToSelectedMessage();
    this.setLoadingState(false);
  }


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
    document.removeEventListener(
      'click',
      this.closeEmojiPickerOnOutsideClick.bind(this)
    );

    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }


  ngAfterViewInit() {
    if (this.chatContainer) {
      this.scrollService.scrollToBottomOfMainChat(this.chatContainer);
    }
    setTimeout(() => {
      document.addEventListener(
        'click',
        this.closeEmojiPickerOnOutsideClick.bind(this)
      );
    }, 0);
  }


  private async handleSelectedMessage(message: Message) {
    const chatId = message.chatId;
    const isPrivate = message.isPrivateChat;
  
    if (chatId) {
      if (
        this.currentChat?.id !== chatId ||
        this.isCurrentChatPrivate !== isPrivate
      ) {
        await this.loadChatById(chatId, isPrivate);
      }
      if (message.id) {
        this.scrollService.scrollToMessage(message.id);
      }
    }
  }


  private subscribeToChannels(): void {
    const privateChannelsSub = this.channelService
      .getPrivateChannels()
      .subscribe((channels) => {
        this.privateChannels = channels;
      });
    this.subscriptions.add(privateChannelsSub);
    const publicChannelsSub = this.channelService
      .getPublicChannels()
      .subscribe((channels) => {
        this.publicChannels = channels;
      });
    this.subscriptions.add(publicChannelsSub);
  }


  private subscribeToSelectedMessage(): void {
    this.navigationSubscription = this.navigationService.selectedMessage$.subscribe((message) => {
      if (message) {
        this.handleSelectedMessage(message);
      }
    });
    this.subscriptions.add(this.navigationSubscription);
  }


  private initializeUser(): void {
    const authSub = this.authService.getUser().subscribe((user) => {
      if (user) {
        this.setUserDetails(user);
      }
    });
    this.subscriptions.add(authSub);
  }


  private setUserDetails(user: any): void {
    this.currentUserId = user.uid;
    this.currentUserName = user.displayName || '';
  }


  private subscribeToCurrentChat(): void {
    const chatSub = this.chatService.currentChat$
      .pipe(
        switchMap(({ chat, isPrivate }) => {
          if (chat && chat.id) {
            return this.channelService
              .getChannel(chat.id, isPrivate)
              .pipe(map((updatedChat) => ({ chat: updatedChat, isPrivate })));
          } else {
            return of({ chat: null, isPrivate: false });
          }
        })
      )
      .subscribe(({ chat, isPrivate }) => {
        this.currentChat = chat;
        this.isCurrentChatPrivate = isPrivate;
        this.selectedChat = !!chat;
        this.previousChatId = chat?.id || null;

        if (!this.currentChat) {
          return;
        }

        this.getUsersOfSelectedChannel(this.currentChat);
        this.otherUser = this.getOtherUserInPrivateChat(this.currentChat);

        this.getUserNameById(this.currentChat);
      });
    this.subscriptions.add(chatSub);
  }

  private subscribeToMessages(): void {
    const messagesSub = this.chatService.messages$.subscribe({
      next: this.handleMessagesResponse.bind(this),
      error: this.handleMessagesError.bind(this),
    });
    this.subscriptions.add(messagesSub);
  }

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

      if (this.messages && this.userProfiles) {
        this.scrollService.scrollToBottomOfMainChat(this.chatContainer);
      }
    });
  }

  convertToDate(timestamp: Timestamp | FieldValue): Date {
    return convertTimestampToDate(timestamp);
  }

  isNewDay(currentMessage: Message, index: number): boolean {
    if (index === 0) return true;
    const previousMessage = this.messages[index - 1];
    return helperIsNewDay(currentMessage, previousMessage);
  }

  private subscribeToLoadingState(): void {
    const loadingSub = this.chatService.loadingState$.subscribe((isLoading) => {
      this.isLoading = isLoading;
    });
    this.subscriptions.add(loadingSub);
  }

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

  sendMessage(event?: Event) {
    event?.preventDefault();
    if (!this.isChatSelected() || this.isMessageEmpty()) {
      return;
    }

    this.selectedFile
      ? this.uploadAttachmentAndSendMessage()
      : this.createAndSendMessage();
  }

  private async uploadAttachmentAndSendMessage(): Promise<void> {
    const autoId = doc(collection(this.firestore, 'dummy')).id;
    const filePath = `chat-files/${this.currentChat.id}/${autoId}_${this.selectedFile?.name}`;
    const downloadUrl = await firstValueFrom(
      this.firebaseStorageService.uploadFile(this.selectedFile!, filePath)
    );
    this.attachmentUrl = downloadUrl;
    await this.createAndSendMessage();
  }

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

  private isChatSelected(): boolean {
    return this.currentChat && this.currentChat.id;
  }

  private isMessageEmpty(): boolean {
    return this.newMessageText.trim() === '' && !this.selectedFile;
  }

  private clearMessageInput(): void {
    this.newMessageText = '';
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.previewUrl = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private setLoadingState(isLoading: boolean) {
    this.isLoading = isLoading;
    this.chatService.setLoadingState(isLoading);
  }

  trackByUserId(index: number, user: User): string {
    return user.userId ? user.userId : index.toString();
  }


  isChatUserProfile(chat: User | Channel): chat is User {
    return (chat as User).avatar !== undefined;
  }

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

  onMouseEnter(propertyName: string) {
    this.hoverStates[propertyName] = true;
  }

  onMouseLeave(propertyName: string) {
    this.hoverStates[propertyName] = false;
  }

  getUserName(senderId: string): string {
    return this.userProfiles[senderId]?.name || 'Unknown User';
  }

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
        this.openProfilePopup(result.userId);
        alreadyOpen = true;
      }
    });
  }


  openProfilePopup(userId: string) {
    if (!this.isProfileOpen && userId) {
      this.profileSubscription = this.userService.getUser(userId).subscribe((user: User) => {
        this.clickedUser = user;
      });
      this.isProfileOpen = true;
    }
  }

  closeProfil() {
    if (this.isProfileOpen) {
      this.isProfileOpen = false;
      if (this.profileSubscription) {
        this.profileSubscription.unsubscribe();
        this.profileSubscription = null;
      }
    }
  }

  openChannelInfoPopup() {
    this.selectedChannel = this.currentChat as Channel;
  }

  closeChannelInfoPopup() {
    this.selectedChannel = null;
  }

  onHeaderChannelNameClick(event: Event) {
    event.stopPropagation();
    if (this.isCurrentChatPrivate && this.clickedUser?.userId) {
      this.openProfilePopup(this.clickedUser.userId);
    } else {
      this.openChannelInfoPopup();
    }
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.clearErrorMessage();

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validation: FileValidationResult = isValidFile(file);

      if (!validation.isValid) {
        if (validation.errorMessage) {
          setErrorMessage(this, validation.errorMessage);
        }
        return;
      }

      createFilePreview(file).then((preview) => {
        if (preview) {
          this.previewUrl = preview;
          this.attachmentUrl = null;
          this.selectedFile = file;
          clearErrorMessage(this);
        }
      }).catch((error) => {
        setErrorMessage(this, 'Fehler beim Erstellen der Dateivorschau.');
      });
    }
  }

  private handleMessagesError(error: any): void {
    console.error('Error loading messages:', error);
    this.setLoadingState(false);
  }

  setErrorMessage(message: string): void {
    setErrorMessage(this, message);
  }

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

  private unsubscribeClickedUser() {
    if (this.clickedUserSubscription) {
      this.clickedUserSubscription.unsubscribe();
      this.clickedUserSubscription = null;
    }
  }

  private isGroupChat(currentChat: any): boolean {
    return currentChat?.members?.length > 1;
  }

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

  private handleSingleUserChat() {
    this.clickedUserName = `${this.currentUserName} (Du)`;

    this.clickedUserSubscription = this.userService.getUser(this.currentUserId).subscribe((user: User) => {
      this.clickedUser = user;
    });
  }


  getOtherUserOfMembers(currentChatMembers: string[]): string | null {
    for (const member of currentChatMembers) {
      if (member !== this.currentUserId) {
        return member;
      }
    }
    return null;
  }

  addAttachmentToMessage(downloadUrl: string) {
    const newMessage: Message = {
      content: this.newMessageText,
      content_lowercase: this.newMessageText.toLowerCase(),
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat.id,
      isPrivateChat: this.isCurrentChatPrivate,
      attachments: [downloadUrl],
    };

    this.chatService.addMessage(newMessage);
    this.newMessageText = '';
  }

  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null;
    this.fileInput.nativeElement.value = '';
  }


  addUserPopup(currentChannel: Channel) {
    console.log('addUserPopup:', currentChannel);
  }

  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  closeOverlay() {
    this.overlayImageUrl = null;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
    if (this.showEmojiPicker) {
      setTimeout(() => {
        this.preventImmediateClose = false;
      }, 100);
    }
  }

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

  addEmoji(event: any) {
    this.newMessageText += event.emoji.native;
    this.showEmojiPicker = false;
    this.focusTextarea();
  }

  focusTextarea() {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  }

  trackByMessageId(index: number, message: Message): string {
    return message.id ? message.id : index.toString();
  }

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

  onChannelSelected(channel: Channel) {
    this.chatService.setCurrentChat(channel, false);
    this.newMessageText = '';
    this.showChannelDropdown = false;
    this.channelSearchTerm = '';
  }

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

  async loadChatById(chatId: string, isPrivate: boolean) {
    const chat = await firstValueFrom(
      this.channelService.getChannel(chatId, isPrivate)
    );
    this.currentChat = chat;
    this.isCurrentChatPrivate = isPrivate;
    this.chatService.setCurrentChat(chat, isPrivate);
  }
}
