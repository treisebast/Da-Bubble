import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
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
import {
  firstValueFrom,
  forkJoin,
  map,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { ProfilComponent } from '../profil/profil.component';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import {
  MatDialog,
  MatDialogClose,
  MatDialogModule,
} from '@angular/material/dialog';
import { DialogShowMembersComponent } from './dialog-show-members/dialog-show-members.component';

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
    MatDialogModule,
    MatDialogClose,
  ],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss'],
})
export class ChatMainComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading: boolean = false;
  hoverStates: { [key: string]: boolean } = {};
  showEmojiPicker = false;
  currentChat: any = null;
  selectedChat: boolean = false;
  isCurrentChatPrivate: boolean = false;
  preventImmediateClose: boolean = true;

  selectedChannel: Channel | null = null;
  overlayImageUrl: string | null = null;
  userProfiles: { [key: string]: any } = {};
  usersOfSelectedChannel: User[] = [];
  currentUserId = '';
  currentUserName = '';
  clickedUser: User | null = null;
  private profileSubscription: Subscription | null = null;
  clickedUserName: string = '';
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

  @Output() openThreadEvent = new EventEmitter<void>();

  @ViewChild('chatContainer', { static: false })
  private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  private subscriptions = new Subscription();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private threadService: ThreadService,
    private firebaseStorageService: FirebaseStorageService,
    private firestore: Firestore,
    private sharedChannelService: SharedChannelService,
    public dialog: MatDialog
  ) {
    registerLocaleData(localeDe);
  }

  ngOnInit() {
    this.setLoadingState(true);
    this.initializeUser();
    this.subscribeToCurrentChat();
    this.subscribeToLoadingState();

    // Subscribe to private channels
    const privateChannelsSub =
      this.sharedChannelService.privateChannels$.subscribe((channels) => {
        this.privateChannels = channels;
      });
    this.subscriptions.add(privateChannelsSub);

    // Subscribe to public channels
    const publicChannelsSub =
      this.sharedChannelService.publicChannels$.subscribe((channels) => {
        this.publicChannels = channels;
      });
    this.subscriptions.add(publicChannelsSub);

    this.setLoadingState(false);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
      this.profileSubscription = null;
    }
    document.removeEventListener(
      'click',
      this.closeEmojiPickerOnOutsideClick.bind(this)
    );
  }

  ngAfterViewInit() {
    this.scrollToBottom();
    setTimeout(() => {
      document.addEventListener(
        'click',
        this.closeEmojiPickerOnOutsideClick.bind(this)
      );
    }, 0);
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
    const chatSub = this.chatService.currentChat$.subscribe(({ chat, isPrivate }) => {
      this.currentChat = chat;
      this.isCurrentChatPrivate = isPrivate;
      this.selectedChat = !!chat;

      if (!this.currentChat) {
        return;
      }

      this.getUsersOfSelectedChannel(this.currentChat);
      this.otherUser = this.getOtherUserInPrivateChat(this.currentChat);

      // Füge diesen Aufruf hinzu:
      this.getUserNameById(this.currentChat);

      this.subscribeToMessages();
    });
    this.subscriptions.add(chatSub);
  }

  private subscribeToMessages(): void {
    this.messages$ = this.chatService.messages$.pipe(
      map((messages) => this.sortMessagesByTimestamp(messages))
    );

    const messagesSub = this.messages$.subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loadUserProfiles();
        this.scrollToBottom(); // Hier scrollen
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      },
    });
    this.subscriptions.add(messagesSub);
  }

  private subscribeToLoadingState(): void {
    const loadingSub = this.chatService.loadingState$.subscribe((isLoading) => {
      this.isLoading = isLoading;
    });
    this.subscriptions.add(loadingSub);
  }

  private getUsersOfSelectedChannel(chat: any) {
    if (chat && chat.members && chat.members.length > 0) {
      const usersSub = this.userService.getUsers().subscribe((users) => {
        this.usersOfSelectedChannel = users.filter((user) =>
          chat.members.includes(user.userId)
        );
      });
      this.subscriptions.add(usersSub);
    }
  }

  private getOtherUserInPrivateChat(chat: Channel): User | null {
    if (chat && chat.members && chat.members.length > 1) {
      return this.usersOfSelectedChannel.find(user => user.userId !== this.currentUserId) || null;
    }
    return null;
  }

  private loadUserProfiles() {
    const messagesSub = this.messages$.subscribe({
      next: (messages: Message[]) => {
        const userIds = [...new Set(messages.map((message) => message.senderId))];

        userIds.forEach((userId) => {
          if (!this.userProfiles[userId]) {
            const userSub = this.userService.getUser(userId).subscribe({
              next: (user: User) => {
                this.userProfiles[userId] = {
                  name: user.name,
                  avatar: user.avatar,
                  status: user.status === 'online',
                };
              },
              error: (error) => {
                console.error(`Error loading user profile for userId ${userId}:`, error);
              },
            });
            this.subscriptions.add(userSub);
          }
        });
      },
      error: (error) => {
        console.error('Error loading messages:', error);
      },
    });
    this.subscriptions.add(messagesSub);
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
      .addMessage(newMessage)
      .then(() => {
        this.clearMessageInput();
        this.scrollToBottom();
        this.setLoadingState(false);
      })
      .catch((error) => {
        console.error('Error sending message:', error);
        this.setLoadingState(false);
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
  }

  private setLoadingState(isLoading: boolean) {
    this.isLoading = isLoading;
    this.chatService.setLoadingState(isLoading);
  }

  private sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort(
      (a, b) =>
        this.convertToDate(a.timestamp).getTime() -
        this.convertToDate(b.timestamp).getTime()
    );
  }

  convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
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

  isChatUserProfile(chat: User | Channel): chat is User {
    return (chat as User).avatar !== undefined;
  }

  async openThread(message: Message) {
    if (!message || !message.id) {
      console.error('Invalid message object:', message);
      return;
    }

    // Emit the event to notify MainPageComponent
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

  showUserListPopup(currentChat: Channel): void {
    const dialogRef = this.dialog.open(DialogShowMembersComponent, {
      data: { members: this.usersOfSelectedChannel, currentChat },
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

  // // ProfileCard
  // openProfilePopup(userId: string) {
  //   if (!this.isProfileOpen){
  //     this.userService.getUser(userId).subscribe((user: User) => {
  //       this.clickedUser = user;
  //       console.log('open Profile for:', user);
  //     });
  //     this.isProfileOpen = true;
  //   }
  // }


  openProfilePopup(userId: string) {
    if (!this.isProfileOpen && userId) {
      this.profileSubscription = this.userService.getUser(userId).subscribe({
        next: (user: User) => {
          this.clickedUser = user;
          console.log('Profile geöffnet für:', user);
        },
        error: (error) => {
          console.error(`Fehler beim Laden des Profils für Benutzer ${userId}:`, error);
        },
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
    if (this.isCurrentChatPrivate) {
      this.openProfilePopup(this.clickedUser?.userId!);
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

      if (!this.isValidFile(file)) {
        return;
      }

      this.createFilePreview(file);
    }
  }

  private handleMessagesResponse(messages: Message[]): void {
    const validMessages = messages.filter((message) => message.timestamp);
    const sortedMessages = this.sortMessagesByTimestamp(validMessages);

    const metadataRequests: Observable<Message>[] = sortedMessages.map(
      (message) => this.loadMetadataForMessage(message)
    );

    forkJoin(metadataRequests).subscribe((messagesWithMetadata: Message[]) => {
      this.messages = messagesWithMetadata; // Assign to this.messages
      this.loadUserProfiles();
      this.setLoadingState(false);

      if (this.messages && this.userProfiles) {
        this.scrollToBottom();
      }
    });
  }

  private handleMessagesError(error: any): void {
    console.error('Error loading messages:', error);
    this.setLoadingState(false);
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

    this.chatService.addMessage(newMessage);
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
      this.publicChannels
    );

    this.filteredChannels = privateChannels;
    this.filteredPublicChannels = publicChannels;
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

  addUserPopup(currentChannel: Channel) {
    console.log('addUserPopup:', currentChannel);
  }

  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  closeOverlay() {
    this.overlayImageUrl = null;
  }

  // Emoji Picker
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
