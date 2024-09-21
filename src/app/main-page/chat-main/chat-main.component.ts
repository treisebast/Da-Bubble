import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../shared/models/channel.model';
import { Message } from '../../shared/models/message.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { AuthService } from '../../shared/services/auth.service';
import {
  Timestamp,
  FieldValue,
  serverTimestamp,
} from '@angular/fire/firestore';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MessageComponent } from '../message/message.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import localeDe from '@angular/common/locales/de';
import { ChannelInfoPopupComponent } from '../channel-info-popup/channel-info-popup.component';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { Firestore, collection, doc } from '@angular/fire/firestore';
import { SharedChannelService } from '../../shared/services/shared-channel.service';
import { firstValueFrom, forkJoin, map, Observable, of } from 'rxjs';
import { ProfilComponent } from '../profil/profil.component';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    MessageComponent,
    MatProgressSpinnerModule,
    ChannelInfoPopupComponent,
    ProfilComponent,
    ImageOverlayComponent,
    PickerComponent,
  ],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss'],
})
export class ChatMainComponent implements OnInit, AfterViewInit {
  isLoading: boolean = false;
  hoverStates: { [key: string]: boolean } = {};
  showEmojiPicker = false;
  currentChat: any = null;
  selectedChat: boolean = false;
  isCurrentChatPrivate: boolean = false;
  preventImmediateClose: boolean = true;

  selectedChannel: Channel | null = null;
  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  puplicChannels: Channel[] = [];
  filteredChannels: Channel[] = [];
  filteredPuplicChannels: Channel[] = [];

  currentThreadData: any;
  overlayImageUrl: string | null = null;
  userProfiles: { [key: string]: any } = {};
  usersOfSelectedChannel: User[] = [];
  currentUserId = '';
  currentUserName = '';
  clickedUser: User | null = null;
  clickedUserName: string = '';

  messages: Message[] = [];
  messages$: Observable<Message[]> = new Observable<Message[]>();
  newMessageText = '';
  errorMessage: string | null = null;
  errorTimeout: any;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  attachmentUrl: string | null = null;

  isProfileOpen: boolean = false;

  @ViewChild('chatContainer', { static: false })
  private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private threadService: ThreadService,
    private firebaseStorageService: FirebaseStorageService,
    private firestore: Firestore,
    private sharedChannelService: SharedChannelService
  ) {
    registerLocaleData(localeDe);
  }

  ngOnInit() {
    this.setLoadingState(true);
    this.initializeUser();
    this.subscribeToCurrentChat();
    this.subscribeToSelectedChat();
    this.subscribeToLoadingState();

    this.setLoadingState(false);
    this.loadChannelsForSearch();
  }

  trackByUserId(index: number, user: User): string {
    return user.userId;
  }

  isNewDay(
    timestamp: Timestamp | FieldValue | undefined,
    index: number
  ): boolean {
    if (index === 0) return true;

    // Sicherheitsüberprüfung auf `timestamp` und vorherige Nachricht
    const prevMessage = this.messages[index - 1];
    if (!prevMessage || !prevMessage.timestamp || !timestamp) {
      return false; // oder true, falls du das Verhalten anders willst
    }

    const prevDate = this.convertToDate(prevMessage.timestamp);
    const currentDate = this.convertToDate(timestamp);
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }

  loadChannelsForSearch() {
    this.sharedChannelService.privateChannels$.subscribe((channels) => {
      this.privateChannels = channels;
    });

    this.sharedChannelService.puplicChannels$.subscribe((channels) => {
      this.puplicChannels = channels;
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.chatContainer) {
          this.chatContainer.nativeElement.scrollTop =
            this.chatContainer.nativeElement.scrollHeight;
        }
      } catch (err) {
        console.error('Scroll to bottom failed:', err);
      }
    }, 300);
  }

  async loadMessages(isPrivateOrNot: boolean) {
    this.setLoadingState(true);
    this.isCurrentChatPrivate = isPrivateOrNot;

    if (this.currentChat?.id && !this.currentChat?.isPrivate) {
      this.chatService
        .getMessages(this.currentChat.id, isPrivateOrNot)
        .subscribe({
          next: this.handleMessagesResponse.bind(this),
          error: this.handleMessagesError.bind(this),
        });
    }
    if (this.currentChat?.id && this.currentChat?.isPrivate) {
      this.chatService
        .getMessages(this.currentChat.id, isPrivateOrNot)
        .subscribe({
          next: this.handleMessagesResponse.bind(this),
          error: this.handleMessagesError.bind(this),
        });
    } else {
      this.setLoadingState(false);
    }
  }

  loadUserProfiles() {
    this.messages$.subscribe({
      next: (messages: Message[]) => {
        const userIds = [
          ...new Set(messages.map((message) => message.senderId)),
        ];

        userIds.forEach((userId) => {
          if (!this.userProfiles[userId]) {
            this.userService.getUser(userId).subscribe({
              next: (user: User) => {
                this.userProfiles[userId] = {
                  name: user.name,
                  avatar: user.avatar,
                  status: user.status === 'online',
                };
              },
              error: (error) => {
                console.error(
                  `Error loading user profile for userId ${userId}:`,
                  error
                );
              },
              complete: () => {
                console.log(`Completed loading profile for userId ${userId}`);
              },
            });
          }
        });
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      },
      complete: () => {
      },
    });
  }

  sendMessage(event?: Event) {
    event?.preventDefault();
    if (!this.isChatSelected() || this.isMessageEmpty()) {
      console.error('No chat selected or message is empty');
      return;
    }

    this.setLoadingState(true);
    this.selectedFile
      ? this.uploadAttachmentAndSendMessage()
      : this.createAndSendMessage();
  }

  isChatUserProfile(chat: User | Channel): chat is User {
    return (chat as User).avatar !== undefined;
  }

  async openThread(message: Message) {
    this.chatService.setChannelTrue();

    if (!message || !message.id) {
      console.error('Invalid message object:', message);
      return;
    }

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

  // ProfileCard
  openProfilePopup(userId: string) {
    this.userService.getUser(userId).subscribe((user: User) => {
      this.clickedUser = user;
      this.isProfileOpen = true;
      console.log('open Profile for:', user);
    });
  }

  closeProfil() {
    this.isProfileOpen = false;
  }

  openChannelInfoPopup() {
    this.selectedChannel = this.currentChat as Channel;
  }

  closeChannelInfoPopup() {
    this.selectedChannel = null;
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.clearErrorMessage();

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.isValidFile(file)) {
        return;
      }

      this.createFilePreview(file);
    }
  }

  private isValidFile(file: File): boolean {
    const maxSizeInKB = 500;
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];

    if (file.size > maxSizeInKB * 1024) {
      this.setErrorMessage(
        `Die Datei überschreitet die maximal erlaubte Größe von ${maxSizeInKB}KB.`
      );
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.setErrorMessage('Nur Bilder (PNG, JPEG) und PDFs sind erlaubt.');
      return false;
    }

    return true;
  }

  private createFilePreview(file: File): void {
    if (file.type === 'application/pdf') {
      this.previewUrl = '../../assets/img/chatChannel/pdf.png';
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.attachmentUrl = null;
        this.selectedFile = file;
        this.clearErrorMessage();
      };
      reader.readAsDataURL(file);
    }
    this.attachmentUrl = null;
    this.selectedFile = file;
    this.clearErrorMessage();
  }

  private setErrorMessage(message: string): void {
    this.errorMessage = message;
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.errorTimeout = setTimeout(() => {
      this.errorMessage = null;
    }, 4000);
  }

  private clearErrorMessage(): void {
    this.errorMessage = null;
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }

  async getUserNameById(currentChat: any) {
    if (currentChat && currentChat.members && currentChat.members.length > 1) {
      const otherUserId = this.getOtherUserOfMembers(currentChat.members);
      const userName = await this.userService.getUserNameById(otherUserId);
      this.clickedUserName = userName || 'Unbekannter Benutzer'; // Fallback-Wert
      this.userService.getUser(otherUserId).subscribe((user: User) => {
        this.clickedUser = user;
      });
    } else {
      this.clickedUserName = `${this.currentUserName} (Du)`;
      this.userService.getUser(this.currentUserId).subscribe((user: User) => {
        this.clickedUser = user;
      });
    }
  }

  getOtherUserOfMembers(currentChatMembers: string[]): string {
    for (const member of currentChatMembers) {
      if (member !== this.currentUserId) {
        return member;
      }
    }
    return '';
  }

  addAttachmentToMessage(downloadUrl: string) {
    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat.id,
      attachments: [downloadUrl],
    };

    this.chatService.addMessage(
      this.currentChat.id,
      newMessage,
      this.isCurrentChatPrivate
    );
    this.newMessageText = '';
  }

  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null;
    this.fileInput.nativeElement.value = '';
  }

  onKeyUp(event: KeyboardEvent) {
    const input = (event.target as HTMLInputElement).value.trim();
    this.filterChannels(input);
  }

  // ------------------------------------------------------------------------------------------------
  // ------------------------------------- Private methods ------------------------------------------
  // ------------------------------------------------------------------------------------------------

  private filterChannels(input: string) {
    const privateChannels = this.filterChannelList(
      input,
      '@',
      this.privateChannels
    );
    const publicChannels = this.filterChannelList(
      input,
      '#',
      this.puplicChannels
    );

    this.filteredChannels = privateChannels;
    this.filteredPuplicChannels = publicChannels;
  }

  private filterChannelList(
    input: string,
    symbol: string,
    channels: Channel[]
  ): Channel[] {
    const match = input.match(new RegExp(`\\${symbol}([a-zA-Z0-9]+)`));
    return match
      ? channels.filter((ch) =>
          ch.name?.toLowerCase().includes(match[1].toLowerCase())
        )
      : [];
  }
  private handleMessagesResponse(messages: Message[]): void {
    const validMessages = messages.filter((message) => message.timestamp);
    const sortedMessages = this.sortMessagesByTimestamp(validMessages);

    const metadataRequests: Observable<Message>[] = sortedMessages.map(
      (message) => this.loadMetadataForMessage(message)
    );

    forkJoin(metadataRequests).subscribe((messagesWithMetadata: Message[]) => {
      this.messages$ = of(messagesWithMetadata);
      this.loadUserProfiles();
      this.setLoadingState(false);

      if (this.messages$ && this.userProfiles) {
        this.scrollToBottom();
      }
    });
  }

  private loadMetadataForMessage(message: Message): Observable<Message> {
    if (message.attachments?.length) {
      const metadataRequests = message.attachments.map((attachment) =>
        this.firebaseStorageService.getFileMetadata(attachment)
      );

      return forkJoin(metadataRequests).pipe(
        map((metadataArray) => {
          message.metadata = {};
          metadataArray.forEach((metadata, index) => {
            message.metadata![message.attachments![index]] = {
              name: metadata.name,
              size: metadata.size,
            };
          });
          return message;
        })
      );
    } else {
      return of(message);
    }
  }

  private handleMessagesError(error: any): void {
    console.error('Error loading messages:', error);
    this.setLoadingState(false);
  }

  private handleMessageSentError(error: any): void {
    console.error('Error sending message:', error);
    this.setLoadingState(false);
  }

  private handleMessageSentSuccess(newMessage: Message): void {
    // this.messages.push(newMessage);
    // this.messages = this.sortMessagesByTimestamp(this.messages);
    this.scrollToBottom();
    this.clearMessageInput();
    this.setLoadingState(false);
  }

  private handleCurrentChat(chat: any): void {
    const isPrivateOrNot = chat.isPrivate;
    this.getUserNameById(chat);
    this.getUsersOfSelectedChannel(chat);
    console.log('handleCurrentChat:', chat);
    this.loadMessages(isPrivateOrNot);
  }

  private getUsersOfSelectedChannel(chat: any) {
    if (chat && chat.members && chat.members.length > 0) {
      this.userService.getUsers().subscribe((users) => {
        this.usersOfSelectedChannel = users.filter((user) =>
          chat.members.includes(user.userId)
        );
      });
    }
  }

  private setLoadingState(isLoading: boolean) {
    this.isLoading = isLoading;
    this.chatService.setLoadingState(isLoading);
  }

  private setUserDetails(user: any): void {
    this.currentUserId = user.uid;
    this.currentUserName = user.displayName || '';
  }

  private initializeUser(): void {
    this.authService.getUser().subscribe((user) => {
      if (user) {
        this.setUserDetails(user);
      }
    });
  }

  private subscribeToCurrentChat(): void {
    this.chatService.currentChat$.subscribe((chat) => {
      this.currentChat = chat;
      console.log('currentChat:', this.currentChat);
      if (!this.currentChat) {
        console.error('No chat selected');
        return;
      }

      this.handleCurrentChat(this.currentChat);

      if (this.currentChat.isPrivate) {
        this.loadPrivateChatMessages(this.currentChat.id);
      } else {
        this.loadPublicChatMessages(this.currentChat.id);
      }
    });
  }

  private loadPublicChatMessages(channelId: string): void {
    this.messages$ = this.chatService
      .getMessagesforChat(channelId)
      .pipe(map((messages) => this.sortMessagesByTimestamp(messages)));
  }

  private loadPrivateChatMessages(channelId: string): void {
    this.messages$ = this.chatService
      .getMessagesforPrivateChat(channelId)
      .pipe(map((messages) => this.sortMessagesByTimestamp(messages)));
  }

  private subscribeToSelectedChat(): void {
    this.chatService.selectedChat$.subscribe((chat) => {
      this.selectedChat = chat;
    });
  }

  private subscribeToLoadingState(): void {
    this.chatService.loadingState$.subscribe((isLoading) => {
      this.isLoading = isLoading;
    });
  }

  private isChatSelected(): boolean {
    return this.currentChat && this.currentChat.id;
  }

  private isMessageEmpty(): boolean {
    return this.newMessageText.trim() === '' && !this.selectedFile;
  }

  private async uploadAttachmentAndSendMessage(): Promise<void> {
    try {
      const autoId = doc(collection(this.firestore, 'dummy')).id;
      const filePath = `chat-files/${this.currentChat.id}/${autoId}_${this.selectedFile?.name}`;
      const downloadUrl = await firstValueFrom(
        this.firebaseStorageService.uploadFile(this.selectedFile!, filePath)
      );
      this.attachmentUrl = downloadUrl;
      this.createAndSendMessage();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      this.setLoadingState(false);
    }
  }

  private createAndSendMessage(): void {
    const newMessage: Message = this.buildNewMessage();
    this.isLoading = false;

    this.chatService
      .addMessage(this.currentChat.id, newMessage, this.isCurrentChatPrivate)
      .then(() => {
        this.handleMessageSentSuccess(newMessage);
      })
      .catch((error) => {
        this.handleMessageSentError(error);
      });
  }

  private buildNewMessage(): Message {
    return {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat.id,
      attachments: this.attachmentUrl ? [this.attachmentUrl] : [],
    };
  }

  private sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort(
      (a, b) =>
        this.convertToDate(a.timestamp).getTime() -
        this.convertToDate(b.timestamp).getTime()
    );
  }

  private clearMessageInput(): void {
    this.newMessageText = '';
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.previewUrl = null;
  }

  addUserPopup(currentChannel: Channel) {
    console.log('addUserPopup:', currentChannel);
  }

  showUserListPopup(currentChannel: Channel) {
    console.log('showUserListPopup:', currentChannel);
  }

  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  closeOverlay() {
    this.overlayImageUrl = null;
  }

  // Emoji Picker //
  ngAfterViewInit() {
    this.scrollToBottom();
    setTimeout(() => {
      document.addEventListener(
        'click',
        this.closeEmojiPickerOnOutsideClick.bind(this)
      );
    }, 0);
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
}
