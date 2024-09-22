// src/app/main-page/thread/thread.component.ts
import { Component, EventEmitter, inject, Output, OnInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { collection, doc, FieldValue, serverTimestamp, Timestamp, getDocs } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, finalize, firstValueFrom, forkJoin, from, of, switchMap, takeUntil } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { getMetadata, getStorage, ref } from 'firebase/storage';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, ImageOverlayComponent, PickerModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss']
})
export class ThreadComponent implements OnInit, OnDestroy {
  showEmojiPicker = false;
  selectedMessage: Message | null = null;
  currentUserId = '';
  currentUserName = '';
  newMessageText = '';
  fileName: string = '';
  fileSize: number = 0;
  totalReplies: number = 0;
  editContent: string = '';

  currentChat: Channel | null = null;
  currentMessageToOpen: Message | null = null;
  overlayImageUrl: string | null = null;
  editingMessageId: string | null | undefined = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  attachmentUrl: string | null = null;
  errorMessage: string | null = null;
  showTooltip: string | null = null;

  messages: Message[] = [];
  lastTwoEmojis: string[] = [];
  userNames: { [key: string]: string } = {};
  userProfiles: { [key: string]: User } = {};
  metadataMap: { [url: string]: { name: string, size: number } } = {};

  errorTimeout: ReturnType<typeof setTimeout> | null = null;

  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  @ViewChild('fileInput') fileInput!: ElementRef;
  @Output() closeThread = new EventEmitter<void>();

  private unsubscribe$ = new Subject<void>();

  constructor(
    private firestore: Firestore,
    private firebaseStorageService: FirebaseStorageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Authentifizierung des Benutzers
    this.authService.getUser().pipe(takeUntil(this.unsubscribe$)).subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || '';
      }
    });

    // Emoji-Abonnements
    this.userService.lastTwoEmojis$.pipe(takeUntil(this.unsubscribe$)).subscribe(emojis => {
      this.lastTwoEmojis = emojis;
    });

    // Aktuelle Nachricht für den Thread öffnen
    this.threadService.getCurrentMessageToOpen().pipe(takeUntil(this.unsubscribe$)).subscribe((chatMessage: Message | null) => {
      if (chatMessage) {
        this.currentMessageToOpen = chatMessage;
        this.resolveUserName(chatMessage.senderId);
        this.loadUserProfiles([chatMessage]);

        if (this.currentChat && this.currentChat.id && chatMessage.id) {
          const chatId = this.currentChat.id;
          this.threadService.watchMessageChanges(chatId, chatMessage.id)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(updatedMessage => {
              this.currentMessageToOpen = updatedMessage;
              this.loadUserProfiles([updatedMessage]);
            });
        }

        this.loadAttachments(chatMessage.attachments);
      }
    });

    // Aktuellen Chat abonnieren
    this.chatService.currentChat$.pipe(takeUntil(this.unsubscribe$)).subscribe(({ chat, isPrivate }) => {
      this.currentChat = chat;
      // Falls benötigt, kannst du `isPrivate` ebenfalls speichern
      // this.isPrivate = isPrivate;
    });

    // Aktuelle Threads abonnieren
    this.threadService.currentThread$.pipe(takeUntil(this.unsubscribe$)).subscribe(async currentThread => {
      if (Array.isArray(currentThread)) {
        this.messages = this.sortMessagesByTimestamp(currentThread);
        await this.resolveUserNames(this.messages);
        this.loadUserProfiles(this.messages);
        this.totalReplies = this.messages.length;

        for (const message of this.messages) {
          this.loadAttachments(message.attachments);
        }
      } else {
        this.messages = [];
      }
    });
  }

  ngOnDestroy() {// Hinzugefügt für die Bereinigung von Subscriptions
    this.unsubscribe$.next(); // Signal zum Beenden senden
    this.unsubscribe$.complete(); // Abo beenden
    this.clearErrorMessage(); // Fehlermeldung löschen
  }

  onCloseThread() {
    this.closeThread.emit();
  }

  // async sendMessage(event?: Event) {
  //   if (event) {
  //     event.preventDefault();
  //   }

  //   // Stelle sicher, dass entweder Text oder eine Datei vorhanden ist
  //   if (this.newMessageText.trim() === '' && !this.selectedFile) {
  //     return;
  //   }

  //   let chatId: string;

  //   if (this.currentChat && this.currentChat.id) {
  //     chatId = this.currentChat.id;
  //   } else {
  //     console.error('Chat ID not found');
  //     return;
  //   }

  //   if (this.selectedFile) {
  //     try {
  //       const autoId = doc(collection(this.firestore, 'dummy')).id;
  //       const filePath = `thread-files/${chatId}/${autoId}_${this.selectedFile.name}`;
  //       const downloadUrl = await firstValueFrom(
  //         this.firebaseStorageService.uploadFile(this.selectedFile, filePath)
  //       );
  //       this.attachmentUrl = downloadUrl as string;
  //     } catch (error) {
  //       console.error('Error uploading file:', error);
  //     }
  //   }

  //   // Erstelle eine Nachricht nur, wenn tatsächlich Text oder Anhänge vorhanden sind
  //   const newMessage: Message = {
  //     content: this.newMessageText,
  //     senderId: this.currentUserId,
  //     timestamp: serverTimestamp(),
  //     chatId: chatId,
  //     attachments: this.attachmentUrl ? [this.attachmentUrl] : [],
  //   };

  //   // Nachricht wird jetzt zum Thread hinzugefügt
  //   try {
  //     await this.threadService.addThread(
  //       chatId,
  //       this.threadService.currentMessageId,
  //       newMessage
  //     );
  //     // Reset der Felder nach dem Senden
  //     this.newMessageText = '';
  //     this.attachmentUrl = null;
  //     this.selectedFile = null;
  //     this.previewUrl = null;
  //   } catch (error) {
  //     console.error('Error sending thread message:', error);
  //   }
  // }

  async sendMessage(event?: Event) {
    if (event) event.preventDefault();
    if (!this.canSendMessage()) return;

    try {
      await this.uploadAttachment();
      await this.addThreadMessage();
      this.resetMessageFields();
    } catch (error) {
      console.error('Error sending thread message:', error);
    }
  }

  canSendMessage(): boolean {
    return this.newMessageText.trim() !== '' || this.selectedFile !== null;
  }

  async uploadAttachment(): Promise<void> {
    if (this.selectedFile) {
      const autoId = doc(collection(this.firestore, 'dummy')).id;
      const filePath = `thread-files/${this.currentChat!.id}/${autoId}_${this.selectedFile.name}`;
      const downloadUrl = await firstValueFrom(
        this.firebaseStorageService.uploadFile(this.selectedFile, filePath)
      );
      this.attachmentUrl = downloadUrl as string;
    }
  }

  async addThreadMessage(): Promise<void> {
    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat?.id ?? '',
      attachments: this.attachmentUrl ? [this.attachmentUrl] : [],
    };

    if (this.currentChat?.id) {
      await this.threadService.addThread(this.currentChat.id, this.threadService.currentMessageId, newMessage);
    } else {
      console.error('Current chat or chat ID is undefined.');
    }
  }

  resetMessageFields(): void {
    this.newMessageText = '';
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.previewUrl = null;
  }

  sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      const dateA = this.convertToDate(a.timestamp);
      const dateB = this.convertToDate(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });
  }

  isNewDay(timestamp: Timestamp | FieldValue, index: number): boolean {
    if (index === 0) return true;
    const prevDate = this.convertToDate(this.messages[index - 1].timestamp);
    const currentDate = this.convertToDate(timestamp);
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  convertToDate(timestamp: Timestamp | FieldValue | Date): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    } else if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  }

  async resolveUserNames(messages: Message[]) {
    const userIds = [...new Set(messages.map(msg => msg.senderId))];
    for (const userId of userIds) {
      await this.resolveUserName(userId);
    }
  }

  async resolveUserName(userId: string) {
    if (!this.userNames[userId]) {
      const userName = await this.userService.getUserNameById(userId);
      this.userNames[userId] = userName as string;
    }
  }

  getUserName(userId: string): string {
    return this.userNames[userId] || 'Unknown';
  }

  loadUserProfiles(messages: Message[]) {
    const userIds = new Set<string>();

    // Sammle alle Benutzer-IDs aus den Nachrichten und Reaktionen
    messages.forEach(message => {
      userIds.add(message.senderId);
      if (message.reactions) {
        Object.values(message.reactions).forEach(userList => {
          userList.forEach(userId => userIds.add(userId));
        });
      }
    });

    const newUserIds = Array.from(userIds).filter(userId => !this.userProfiles[userId]);

    if (newUserIds.length === 0) return;

    // Erstelle eine Liste von Observables für die neuen Benutzer-IDs
    const userObservables = newUserIds.map(userId =>
      this.userService.getUser(userId).pipe(
        catchError(error => {
          console.error(`Error loading user profile for userId ${userId}:`, error);
          return of(null);
        })
      )
    );

    // Verwende forkJoin, um alle Benutzerprofile gleichzeitig zu laden
    forkJoin(userObservables).pipe(takeUntil(this.unsubscribe$)).subscribe(users => {
      users.forEach((user, index) => {
        const userId = newUserIds[index];
        if (user) {
          this.userProfiles[userId] = user;
          console.log("User profile loaded:", user);
        }
      });
    });
  }

  loadAttachments(attachments: string[] | undefined): void {
    if (attachments) {
      attachments.forEach(attachment => {
        if (!this.isImage(attachment)) {
          this.loadFileMetadata(attachment);
        }
      });
    }
  }

  /**
   * Öffnet den Bearbeitungsmodus für die ausgewählte Nachricht.
   * @param {Message} message - Die zu bearbeitende Nachricht.
   */
  editMessage(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.startEditing(message);
    }
  }

  /**
   * Löscht die ausgewählte Nachricht, wenn der aktuelle Benutzer der Absender ist.
   * @param {Message} message - Die zu löschende Nachricht.
   */
  async deleteMessage(message: Message) {
    if (this.canDeleteMessage(message)) {
      try {
        await this.deleteMessageAttachments(message);
        await this.deleteMessageFromThread(message);
        console.log('Message and attachments deleted successfully');
        this.checkAndUpdateThreadCount();
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    } else {
      console.error("You cannot delete another user's message.");
    }
  }

  checkAndUpdateThreadCount() {
    if (this.messages.length === 0 && this.currentMessageToOpen) {
      this.currentMessageToOpen.threadCount = 0;
      this.currentMessageToOpen.lastReplyTimestamp = undefined;
      this.updateThreadInfoInMainChat();
    }
  }

  async updateThreadInfoInMainChat() {
    if (this.currentMessageToOpen?.id && this.currentMessageToOpen.chatId) {
      const { chatId, id: messageId } = this.currentMessageToOpen;

      try {
        await this.threadService.updateThreadInfo(
          chatId,
          messageId,
          0,
          null
        );
        console.log('Thread information updated in main chat');
      } catch (error) {
        console.error('Error updating thread information in main chat:', error);
      }
    } else {
      console.error('messageId or chatId is undefined.');
    }
  }

  private canDeleteMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  private async deleteMessageAttachments(message: Message): Promise<void> {
    const deleteTasks = (message.attachments || []).map((attachmentUrl) => {
      const filePath = this.getFilePathFromUrl(attachmentUrl);
      return this.firebaseStorageService.deleteFile(filePath);
    });

    await Promise.all(deleteTasks);
  }

  private deleteMessageFromThread(message: Message): Promise<void> {
    return this.threadService.deleteThread(
      message.chatId!,
      this.threadService.currentMessageId,
      message.id!
    );
  }

  private getFilePathFromUrl(fileUrl: string): string {
    const pathParts = decodeURIComponent(fileUrl).split('/o/')[1].split('?alt=media')[0];
    return pathParts;
  }

  startEditing(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.editingMessageId = message.id;
      this.editContent = message.content;
    }
  }

  saveEdit(message: Message) {
    if (this.editContent.trim() !== '') {
      message.content = this.editContent;
      this.threadService.updateThread(
        message.chatId!,
        this.threadService.currentMessageId,
        message
      ).then(() => {
        console.log('Message updated successfully');
      }).catch(error => {
        console.error('Error updating message:', error);
      });
    }
    this.editingMessageId = null;
  }

  cancelEdit() {
    this.editingMessageId = null;
  }

  isImage(url: string): boolean {
    const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    return imageTypes.some((type) => url.split('?')[0].toLowerCase().endsWith(type));
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.manageErrorMessage(null);

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
      this.manageErrorMessage(`Die Datei überschreitet die maximal erlaubte Größe von ${maxSizeInKB}KB.`);
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.manageErrorMessage('Nur Bilder (PNG, JPEG) und PDFs sind erlaubt.');
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
        this.manageErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
    this.attachmentUrl = null;
    this.selectedFile = file;
    this.manageErrorMessage(null);
  }

  private manageErrorMessage(message: string | null, timeout: number = 4000): void {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
    this.errorMessage = message;
    if (message) {
      this.errorTimeout = setTimeout(() => {
        this.errorMessage = null;
        this.cdr.detectChanges();
      }, timeout);
    }
  }

  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null;
    this.fileInput.nativeElement.value = '';
  }

  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  closeOverlay() {
    this.overlayImageUrl = null;
  }

  loadFileMetadata(attachmentUrl: string): void {
    console.log(`Lade Metadaten für folgendes Attachment: ${attachmentUrl}`);
    this.firebaseStorageService.getFileMetadata(attachmentUrl)
      .pipe(
        finalize(() => this.cdr.detectChanges()),
        takeUntil(this.unsubscribe$)
      )
      .subscribe({
        next: (metadata) => {
          this.metadataMap[attachmentUrl] = {
            name: metadata.name,
            size: metadata.size
          };
          console.log(`Metadaten geladen für folgendes Attachment: ${attachmentUrl}`, metadata);
        },
        error: (error) => {
          console.error('Fehler beim Abrufen der Metadaten für:', attachmentUrl, error);
        }
      });
  }

  async logAttachmentMetadata(attachmentUrl: string) {
    try {
      const storage = getStorage();
      const filePath = decodeURIComponent(attachmentUrl).split('/o/')[1].split('?alt=media')[0];
      const storageRef = ref(storage, filePath);
      const metadata = await getMetadata(storageRef);

      this.metadataMap[attachmentUrl] = {
        name: metadata.name,
        size: metadata.size,
      };

      console.log('Metadaten geladen:', this.metadataMap[attachmentUrl]);
    } catch (error) {
      console.error('Fehler beim Abrufen der Metadaten:', error);
    }
  }

  isMetadataLoaded(attachment: string): boolean {
    return !!this.metadataMap[attachment];
  }

  logAttachment(attachment: string) {
    console.log('Attachment:', attachment);
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return size + ' B';
    } else {
      return (size / 1024).toFixed(2) + ' KB';
    }
  }

  toggleEmojiPicker(event: MouseEvent, message: Message) {
    event.stopPropagation();
    if (this.selectedMessage === message && this.showEmojiPicker) {
      this.showEmojiPicker = false;
      this.selectedMessage = null;
    } else {
      this.showEmojiPicker = true;
      this.selectedMessage = message;
    }
  }

  onMouseLeave(message: Message) {
    if (this.showEmojiPicker && this.selectedMessage === message) {
      this.showEmojiPicker = false;
      this.selectedMessage = null;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showEmojiPicker) {
      this.showEmojiPicker = false;
      this.selectedMessage = null;
    }
  }

  addEmoji(event: any, message: Message) {
    const emoji = event.emoji.native;
    this.addOrRemoveReaction(message, emoji);
    this.userService.addEmoji(emoji);
    this.showEmojiPicker = false;
  }

  addOrRemoveReaction(message: Message, emoji: string) {
    const userId = this.currentUserId;
    if (!message.reactions) {
      message.reactions = {};
    }
    if (message.reactions[emoji]?.includes(userId)) {
      message.reactions[emoji] = message.reactions[emoji].filter(id => id !== userId);

      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
    } else {
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }
      message.reactions[emoji].push(userId);
    }
    this.userService.addEmoji(emoji);
    if (this.currentMessageToOpen && message.id === this.currentMessageToOpen.id) {
      this.updateMessageReactions(this.currentMessageToOpen);
    } else {
      this.updateMessageReactions(message);
    }
  }

  getReactionCount(message: Message, emoji: string): number {
    return message.reactions?.[emoji]?.length || 0;
  }

  async updateMessageReactions(message: Message) {
    const { chatId, id: messageId } = message;
    if (this.currentMessageToOpen && message.id === this.currentMessageToOpen.id) {
      try {
        await this.threadService.updateOriginalMessageReactions(
          chatId,
          this.currentMessageToOpen.id!,
          message.reactions || {}
        );
        console.log('Reactions for original message updated');
      } catch (error) {
        console.error('Error updating reactions for original message:', error);
      }
    } else {
      try {
        await this.threadService.updateThreadMessageReactions(
          chatId,
          this.threadService.currentMessageId,
          message.id!,
          message.reactions || {}
        );
        console.log('Reactions for thread message updated');
      } catch (error) {
        console.error('Error updating reactions for thread message:', error);
      }
    }
  }

  // Tooltip

  getTooltipContent(message: Message, emoji: string): string {
    const usernames = this.getReactionUsernames(message, emoji);
    const numUsers = usernames.length;

    if (numUsers > 3) {
      const displayedUsers = usernames.slice(0, 3).join(', ');
      const remainingUsers = numUsers - 3;
      return `
        <span class="emoji">${emoji}</span>
        <span class="username">${displayedUsers} und ${remainingUsers} weitere Personen</span>
        <span class="reaction-text">${numUsers > 1 ? 'haben' : 'hat'} reagiert</span>
      `;
    } else {
      const displayedUsers = usernames.join(', ');
      return `
        <span class="emoji">${emoji}</span>
        <span class="username">${displayedUsers}</span>
        <span class="reaction-text">${numUsers > 1 ? 'haben' : 'hat'} reagiert</span>
      `;
    }
  }

  getReactionUsernames(message: Message, emoji: string): string[] {
    const userIds = message.reactions?.[emoji] || [];
    const usernames = userIds.map(userId => this.userProfiles[userId]?.name || 'Unknown');
    return usernames;
  }

  clearErrorMessage() {
    this.manageErrorMessage(null);
  }
}
