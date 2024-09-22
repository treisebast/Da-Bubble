import { Component, EventEmitter, inject, Output, OnInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { collection, doc, FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MatMenuModule } from '@angular/material/menu';
import { finalize, firstValueFrom, takeUntil } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { getMetadata, getStorage, ref } from 'firebase/storage';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    ImageOverlayComponent,
    PickerModule,
  ],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss'],
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
  metadataMap: { [url: string]: { name: string; size: number } } = {};

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
  ) {}

  ngOnInit() {
    // Authentifizierung des Benutzers
    this.authService
      .getUser()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (user) => {
          if (user) {
            this.currentUserId = user.uid;
            this.currentUserName = user.displayName || '';
          }
        },
        error: (error) => {
          console.error('Fehler beim Abrufen des Benutzers:', error);
        },
      });

    // Emoji-Abonnements
    this.userService.lastTwoEmojis$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (emojis) => {
          this.lastTwoEmojis = emojis;
        },
        error: (error) => {
          console.error('Fehler beim Abrufen der letzten Emojis:', error);
        },
      });

    // Aktuelle Nachricht für den Thread öffnen
    this.threadService
      .getCurrentMessageToOpen()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (chatMessage: Message | null) => {
          if (chatMessage) {
            this.currentMessageToOpen = chatMessage;
            this.resolveUserName(chatMessage.senderId);
            this.loadUserProfiles([chatMessage]);

            if (this.currentChat && this.currentChat.id && chatMessage.id) {
              const chatId = this.currentChat.id;
              this.threadService
                .watchMessageChanges(chatId, chatMessage.id)
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe({
                  next: (updatedMessage) => {
                    this.currentMessageToOpen = updatedMessage;
                    this.loadUserProfiles([updatedMessage]);
                  },
                  error: (error) => {
                    console.error(
                      'Fehler beim Überwachen der Nachrichtenänderungen:',
                      error
                    );
                  },
                });
            }

            this.loadAttachments(chatMessage.attachments);
          }
        },
        error: (error) => {
          console.error('Fehler beim Abrufen der aktuellen Nachricht:', error);
        },
      });

    // Aktuellen Chat abonnieren
    this.chatService.currentChat$.pipe(takeUntil(this.unsubscribe$)).subscribe({
      next: ({ chat }) => {
        this.currentChat = chat;
      },
      error: (error) => {
        console.error('Fehler beim Abrufen des aktuellen Chats:', error);
      },
    });

    // Aktuelle Threads abonnieren
    this.threadService.currentThread$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: async (currentThread) => {
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
        },
        error: (error) => {
          console.error('Fehler beim Abrufen der aktuellen Threads:', error);
        },
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.clearErrorMessage();
  }

  onCloseThread() {
    this.closeThread.emit();
  }

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
      const filePath = `thread-files/${this.currentChat!.id}/${autoId}_${
        this.selectedFile.name
      }`;
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
      await this.threadService.addThread(
        this.currentChat.id,
        this.threadService.currentMessageId,
        newMessage
      );
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
    const userIds = [...new Set(messages.map((msg) => msg.senderId))];
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

  /**
   * Loads user profiles for the given messages.
   *
   * This method collects all user IDs from the provided messages and filters out
   * the ones that are already loaded. It then fetches the profiles of the new user IDs
   * using the UserService's bulk-fetch method and assigns them to the userProfiles object.
   * @param {Message[]} messages - An array of message objects from which user IDs are collected.
   * @returns {void} This method does not return a value.
   */
  loadUserProfiles(messages: Message[]) {
    const allUserIds = this.collectUserIds(messages);
    const newUserIds = allUserIds.filter(
      (userId) => !this.userProfiles[userId]
    );

    if (newUserIds.length === 0) return;

    // Lade alle neuen Benutzerprofile mit der Bulk-Fetch-Methode aus dem UserService
    this.userService
      .getUsersOnce(newUserIds)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (users) => this.assignUserProfiles(users, newUserIds),
        error: (error) => {
          console.error(
            'Fehler beim Laden der Benutzerprofile mit getUsersOnce:',
            error
          );
        },
      });
  }

  // Collects all user IDs from the given messages and their reactions
  private collectUserIds(messages: Message[]): string[] {
    const userIds = new Set<string>();
    messages.forEach(({ senderId, reactions }) => {
      userIds.add(senderId);
      if (reactions) {
        Object.values(reactions).flat().forEach(userIds.add, userIds);
      }
    });
    return Array.from(userIds);
  }

  // Assigns the fetched user profiles to the corresponding user IDs
  private assignUserProfiles(users: User[], newUserIds: string[]): void {
    users.forEach((user) => {
      if (user) {
        this.userProfiles[user.userId] = user;
      }
    });
    // Setze Standard-Avatare für Benutzer, die nicht gefunden wurden
    this.setStandardAvatars(newUserIds);
    this.cdr.detectChanges(); // Änderungserkennung manuell auslösen
  }

  // Sets standard avatars for users that were not found in the database
  setStandardAvatars(userIds: string[]) {
    userIds.forEach((userId, index) => {
      if (!this.userProfiles[userId]) {
        this.userProfiles[userId] = {
          userId,
          name: 'Unknown',
          email: '',
          avatar: `assets/img/profile/${index % 10}.svg`,
          status: 'offline',
          lastSeen: null,
        };
      }
    });
  }

  trackByMessageId(index: number, message: any): number {
    return message.id;
  }

  /**
   * Loads the attachments and processes each one.
   * If the attachment is not an image, it loads the file metadata.
   * @param attachments - An array of attachment URLs or undefined.
   */
  loadAttachments(attachments: string[] | undefined): void {
    if (attachments) {
      attachments.forEach((attachment) => {
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

  /**
   * Updates the thread information in the main chat.
   * @returns {Promise<void>} A promise that resolves when the thread information is successfully updated.
   * @throws Will log an error message if the `updateThreadInfo` method fails or if `messageId` or `chatId` is undefined.
   */
  async updateThreadInfoInMainChat() {
    if (this.currentMessageToOpen?.id && this.currentMessageToOpen.chatId) {
      const { chatId, id: messageId } = this.currentMessageToOpen;

      try {
        await this.threadService.updateThreadInfo(chatId, messageId, 0, null);
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
    const pathParts = decodeURIComponent(fileUrl)
      .split('/o/')[1]
      .split('?alt=media')[0];
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
      this.threadService
        .updateThread(
          message.chatId!,
          this.threadService.currentMessageId,
          message
        )
        .then(() => {
          console.log('Message updated successfully');
        })
        .catch((error) => {
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
    return imageTypes.some((type) =>
      url.split('?')[0].toLowerCase().endsWith(type)
    );
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
      this.manageErrorMessage(
        `Die Datei überschreitet die maximal erlaubte Größe von ${maxSizeInKB}KB.`
      );
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

  private manageErrorMessage(
    message: string | null,
    timeout: number = 4000
  ): void {
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
    this.firebaseStorageService
      .getFileMetadata(attachmentUrl)
      .pipe(
        finalize(() => this.cdr.detectChanges()),
        takeUntil(this.unsubscribe$)
      )
      .subscribe({
        next: (metadata) => {
          this.metadataMap[attachmentUrl] = {
            name: metadata.name,
            size: metadata.size,
          };
        },
        error: (error) => {
          console.error('Fehler beim Abrufen der Metadaten', error);
        },
      });
  }

  async logAttachmentMetadata(attachmentUrl: string) {
    try {
      const storage = getStorage();
      const filePath = decodeURIComponent(attachmentUrl)
        .split('/o/')[1]
        .split('?alt=media')[0];
      const storageRef = ref(storage, filePath);
      const metadata = await getMetadata(storageRef);

      this.metadataMap[attachmentUrl] = {
        name: metadata.name,
        size: metadata.size,
      };
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

  /**
   * Fügt eine Reaktion hinzu oder entfernt sie.
   * @param message Die Nachricht, auf die reagiert wird.
   * @param emoji Das Emoji der Reaktion.
   */
  addOrRemoveReaction(message: Message, emoji: string): void {
    const userId = this.currentUserId;

    this.toggleUserReaction(message, emoji, userId);
    this.userService.addEmoji(emoji);

    if (this.isOriginalMessage(message)) {
      if (this.currentMessageToOpen) {
        this.updateMessageReactions(this.currentMessageToOpen);
      }
    } else {
      this.updateMessageReactions(message);
    }
  }

  /**
   * Entscheidet, ob eine Reaktion hinzugefügt oder entfernt werden soll.
   * @param message Die Nachricht, auf die reagiert wird.
   * @param emoji Das Emoji der Reaktion.
   * @param userId Die ID des Benutzers.
   */
  private toggleUserReaction(message: Message, emoji: string, userId: string): void {
    if (!message.reactions) {
      message.reactions = {};
    }

    if (this.hasUserReacted(message, emoji, userId)) {
      this.removeUserReaction(message, emoji, userId);
    } else {
      this.addUserReaction(message, emoji, userId);
    }
  }

  private hasUserReacted(message: Message, emoji: string, userId: string): boolean {
    return !!message.reactions?.[emoji]?.includes(userId);
  }

  private addUserReaction(message: Message, emoji: string, userId: string): void {
    if (!message.reactions) {
      message.reactions = {};
    }
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    message.reactions[emoji].push(userId);
  }

  private removeUserReaction(message: Message, emoji: string, userId: string): void {
    if (!message.reactions || !message.reactions[emoji]) {
      return;
    }

    message.reactions[emoji] = message.reactions[emoji].filter(
      (id) => id !== userId
    );

    if (message.reactions[emoji].length === 0) {
      delete message.reactions[emoji];
    }
  }

  private isOriginalMessage(message: Message): boolean {
    return (
      this.currentMessageToOpen !== null &&
      message.id === this.currentMessageToOpen.id
    );
  }

  getReactionCount(message: Message, emoji: string): number {
    return message.reactions?.[emoji]?.length || 0;
  }


  // updates the reactions for the given message
  private async updateMessageReactions(message: Message): Promise<void> {
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
        // Optional: Benutzer informieren, dass das Aktualisieren fehlgeschlagen ist
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
        <span class="reaction-text">${
          numUsers > 1 ? 'haben' : 'hat'
        } reagiert</span>
      `;
    } else {
      const displayedUsers = usernames.join(', ');
      return `
        <span class="emoji">${emoji}</span>
        <span class="username">${displayedUsers}</span>
        <span class="reaction-text">${
          numUsers > 1 ? 'haben' : 'hat'
        } reagiert</span>
      `;
    }
  }

  getReactionUsernames(message: Message, emoji: string): string[] {
    const userIds = message.reactions?.[emoji] || [];
    const usernames = userIds.map(
      (userId) => this.userProfiles[userId]?.name || 'Unknown'
    );
    return usernames;
  }

  clearErrorMessage() {
    this.manageErrorMessage(null);
  }
}
