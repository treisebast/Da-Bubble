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
import { Firestore, collection, doc } from '@angular/fire/firestore'; // Korrekte Importe
import { SharedChannelService } from '../../shared/services/shared-channel.service';
import { firstValueFrom } from 'rxjs';
import { ProfilComponent } from '../profil/profil.component';

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
  ],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss'],
})
export class ChatMainComponent implements OnInit, AfterViewInit {
  isLoading: boolean = false;
  hoverStates: { [key: string]: boolean } = {};

  currentChat: any = null;
  selectedChat: boolean = false;
  isCurrentChatPrivate: boolean = false;

  selectedChannel: Channel | null = null;
  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  puplicChannels: Channel[] = [];
  filteredChannels: Channel[] = [];
  filteredPuplicChannels: Channel[] = [];

  currentThreadData: any;

  userProfiles: { [key: string]: any } = {};
  currentUserId = '';
  currentUserName = '';
  clickedUser: User | null = null;
  clickedUserName: string = '';

  messages: Message[] = [];
  newMessageText = '';

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

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  isNewDay(timestamp: Timestamp | FieldValue, index: number): boolean {
    if (index === 0) return true;
    const prevDate = this.convertToDate(this.messages[index - 1].timestamp);
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

    if (this.currentChat?.id) {
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
    const userIds = [
      ...new Set(this.messages.map((message) => message.senderId)),
    ];
    userIds.forEach((userId) => {
      this.userService.getUser(userId).subscribe((user: User) => {
        this.userProfiles[userId] = {
          name: user.name,
          avatar: user.avatar,
          status: user.status === 'online',
        };
      });
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
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Überprüfe die Dateigröße und den Typ
      if (file.size > 500 * 1024) {
        alert('Die Datei überschreitet die maximal erlaubte Größe von 500KB.');
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Nur Bilder (PNG, JPEG) und PDFs sind erlaubt.');
        return;
      }

      // Vorschau erstellen
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.attachmentUrl = null;
        this.selectedFile = file;
      };
      reader.readAsDataURL(file);
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
    this.messages = this.sortMessagesByTimestamp(messages);
    this.loadUserProfiles();
    this.setLoadingState(false);

    if (this.messages && this.userProfiles) {
      this.scrollToBottom();
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
    this.messages.push(newMessage);
    this.messages = this.sortMessagesByTimestamp(this.messages);
    this.scrollToBottom();
    this.clearMessageInput();
    this.setLoadingState(false);
  }

  private handleCurrentChat(chat: any): void {
    const isPrivateOrNot = chat.isPrivate;
    this.getUserNameById(chat);
    this.loadMessages(isPrivateOrNot);
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

      if (this.currentChat) {
        this.handleCurrentChat(this.currentChat);
        console.log('currentChat:', this.currentChat);
      } else {
        console.error('no chat selected');
      }
    });
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
}
