import { Component, EventEmitter, inject, Output, OnInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MatMenuModule } from '@angular/material/menu';
import { takeUntil } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { getMetadata, getStorage, ref } from 'firebase/storage';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { Subject } from 'rxjs';
import { convertToDate } from '../../shared/utils';
import { MentionDropdownComponent } from '../chat-main/mention-dropdown/mention-dropdown.component';
import { MessageMenuComponent } from '../message/message-menu/message-menu.component';
import { ScrollService } from '../../shared/services/scroll-service.service';
import { ThreadFileHelper } from './thread-file-helper';
import { ThreadReactionHelper } from './thread-reaction-helper';
import { ThreadUserHelper } from './thread-user-helper';
import { ThreadMessageHelper } from './thread-message-helper';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, ImageOverlayComponent, PickerModule, MentionDropdownComponent, MessageMenuComponent],
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
  showTooltip: { [messageId: string]: string | null } = {};
  showTooltipOriginalMessage: string | null = null;
  emojiMartPositionClass: string = '';
  messages: Message[] = [];
  lastTwoEmojis: string[] = [];
  userNames: { [key: string]: string } = {};
  userProfiles: { [key: string]: User } = {};
  metadataMap: { [url: string]: { name: string; size: number } } = {};
  isCurrentChatPrivate: boolean = false;
  showMentionDropdown = false;
  mentionSearchTerm = '';
  mentionStartPosition = -1;
  usersOfSelectedChannel: User[] = [];
  showEmojiMarts = false;
  showMessageBoxEmojiPicker = false;
  preventImmediateClose: boolean = true;
  errorTimeout: ReturnType<typeof setTimeout> | null = null;

  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private scrollService = inject(ScrollService);
  private threadFileHelper = inject(ThreadFileHelper);
  private threadReactionHelper = inject(ThreadReactionHelper);
  private threadUserHelper = inject(ThreadUserHelper);
  private threadMessageHelper = inject(ThreadMessageHelper);
  private unsubscribe$ = new Subject<void>();

  @ViewChild('fileInput') fileInput!: ElementRef;
  @Output() closeThread = new EventEmitter<void>();
  @ViewChild('mentionDropdown') mentionDropdownComponent?: MentionDropdownComponent;
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('threadContainer') threadContainer!: ElementRef;
  @ViewChildren(MessageMenuComponent) messageMenuComponents!: QueryList<MessageMenuComponent>;

  constructor(
    private firestore: Firestore,
    private cdr: ChangeDetectorRef
  ) { }

  /**
 * Initializes the component by subscribing to necessary observables.
 */
  ngOnInit() {
    this.authenticateUser();
    this.subscribeToEmojis();
    this.openCurrentMessage();
    this.subscribeToCurrentChat();
    this.subscribeToCurrentThread();
    this.loadUserListFromCurrentChat();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.showEmojiMarts = true;
    }, 300);
  }

  /**
 * Cleans up subscriptions and clears error messages upon destruction.
 */
  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.clearErrorMessage();
  }

  /**
 * Authenticates the current user and sets user information.
 */
  private authenticateUser() {
    this.authService
      .getUser()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((user) => {
        if (user) {
          this.currentUserId = user.uid;
          this.currentUserName = user.displayName || '';
        }
      });
  }

  /**
 * Subscribes to the last two emojis used by the user.
 */
  private subscribeToEmojis() {
    this.userService.lastTwoEmojis$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((emojis) => {
        this.lastTwoEmojis = emojis;
      });
  }

  /**
 * Opens the current message, loads user profiles, and tracks changes.
 */
  private openCurrentMessage() {
    this.threadService
      .getCurrentMessageToOpen()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((chatMessage: Message | null) => {
        if (chatMessage) {
          this.currentMessageToOpen = chatMessage;
          this.resolveUserName(chatMessage.senderId);
          this.loadUserProfiles([chatMessage]);

          if (this.currentChat && this.currentChat.id && chatMessage.id) {
            this.watchMessageChanges(this.currentChat.id, chatMessage.id);
          }

          this.loadAttachments(chatMessage.attachments);
          this.cdr.detectChanges();
          this.focusTextarea();
        }
      });
  }

  /**
 * Monitors changes for a specific message in the current chat.
 */
  private watchMessageChanges(chatId: string, messageId: string) {
    this.threadService
      .watchMessageChanges(chatId, messageId)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((updatedMessage) => {
        this.currentMessageToOpen = updatedMessage;
        this.loadUserProfiles([updatedMessage]);
      });
  }

  /**
 * Subscribes to updates for the current chat.
 */
  private subscribeToCurrentChat() {
    this.chatService.currentChat$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(({ chat }) => {
        this.currentChat = chat;
      });
  }

  /**
 * Subscribes to messages in the current thread and sorts them by timestamp.
 */
  private subscribeToCurrentThread() {
    this.threadService.currentThread$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(async (currentThread) => {
        if (Array.isArray(currentThread)) {
          this.messages = this.sortMessagesByTimestamp(currentThread);
          await this.resolveUserNames(this.messages);
          this.loadUserProfiles(this.messages);
          this.totalReplies = this.messages.length;

          for (const message of this.messages) {
            this.loadAttachments(message.attachments);
          }
          this.cdr.detectChanges();
          this.scrollService.scrollToBottomOfThread(this.threadContainer);
          this.focusTextarea();
        } else {
          this.messages = [];
        }
      });
  }

  /**
 * Loads the list of users from the current chat.
 */
  private loadUserListFromCurrentChat() {
    if (this.currentChat && this.currentChat.members) {
      this.userService
        .getUsers()
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe((users) => {
          this.usersOfSelectedChannel = users.filter((user) =>
            this.currentChat!.members.includes(user.userId)
          );
        });
    }
  }

  /**
 * Emits a close event for the thread.
 */
  onCloseThread() {
    this.closeThread.emit();
  }

  /**
 * Returns a unique key for each message.
 */
  getMessageKey(message: Message, index: number): string {
    return message.id || `index-${index}`;
  }

  /**
 * Sends a new message or adds an attachment, if available.
 */
  async sendMessage(event?: Event) {
    if (event) event.preventDefault();
    if (!this.canSendMessage()) return;
    await this.uploadAttachment();
    await this.addThreadMessage();
    this.resetMessageFields();
    this.scrollService.scrollToBottomOfThread(this.threadContainer);

  }

  /**
 * Checks if the message can be sent based on content or attachment presence.
 */
  canSendMessage(): boolean {
    return this.newMessageText.trim() !== '' || this.selectedFile !== null;
  }

  /**
 * Uploads an attachment file if available.
 */
  async uploadAttachment(): Promise<void> {
    if (this.selectedFile && this.currentChat) {
      this.attachmentUrl = await this.threadFileHelper.uploadAttachment(
        this.selectedFile,
        this.currentChat.id,
        this.firestore
      );
    }
  }

  /**
   * Adds a message to the current thread.
   */
  async addThreadMessage(): Promise<void> {
    const newMessage: Message = {
      content: this.newMessageText,
      content_lowercase: this.newMessageText.toLowerCase(),
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      isPrivateChat: this.isCurrentChatPrivate,
      chatId: this.currentChat?.id ?? '',
      attachments: this.attachmentUrl ? [this.attachmentUrl] : [],
    };

    if (this.currentChat?.id) {
      await this.threadService.addThread(
        this.currentChat.id,
        this.threadService.currentMessageId,
        newMessage
      );
    }
  }

  /**
 * Resets the input fields for a new message.
 */
  resetMessageFields(): void {
    this.threadMessageHelper.resetMessageFields(this);
  }

  /**
 * Sorts messages in the current thread by their timestamps.
 */
  sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      const dateA = convertToDate(a.timestamp);
      const dateB = convertToDate(b.timestamp);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
 * Checks if a message was sent on a new day.
 */
  isNewDay(timestamp: Timestamp | FieldValue | Date, index: number): boolean {
    if (index === 0) return true;
    const prevDate = convertToDate(this.messages[index - 1].timestamp);
    const currentDate = convertToDate(timestamp);
    if (!prevDate || !currentDate) return false;
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  /**
 * Converts a timestamp to a Date object.
 */
  convertToDate(
    timestamp: Timestamp | FieldValue | Date | null | undefined
  ): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    } else if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  }

  /**
 * Resolves and loads usernames for messages in a thread.
 */
  async resolveUserNames(messages: Message[]) {
    await this.threadUserHelper.resolveUserNames(messages, this.userNames);
  }

  /**
 * Resolves the username for a single user ID.
 */
  async resolveUserName(userId: string) {
    if (!this.userNames[userId]) {
      const userName = await this.userService.getUserNameById(userId);
      this.userNames[userId] = userName as string;
    }
  }

  /**
 * Retrieves the username for a given user ID.
 */
  getUserName(userId: string): string {
    return this.userProfiles[userId]?.name || 'Unknown';
  }

  /**
 * Loads profiles for users mentioned in the messages.
 */
  loadUserProfiles(messages: Message[]) {
    this.threadUserHelper.loadUserProfiles(
      messages,
      this.userProfiles,
      this.cdr,
      this.unsubscribe$
    );
  }

  /**
 * Returns a tracking ID for a message for optimized rendering.
 */
  trackByMessageId(index: number, message: any): number {
    return message.id;
  }

  /**
   * Loads attachments for a message if present.
   */
  loadAttachments(attachments: string[] | undefined): void {
    this.threadMessageHelper.loadAttachments(attachments, this);
  }

  /**
   * Initiates editing for a specific message.
   */
  editMessage(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.startEditing(message);
    }
  }

  /**
 * Deletes a message and its attachments from the thread.
 */
  async deleteMessage(message: Message) {
    if (this.canDeleteMessage(message)) {
      await this.deleteMessageAttachments(message);
      await this.deleteMessageFromThread(message);
      this.checkAndUpdateThreadCount();
    }
  }

  /**
 * Updates the thread count and timestamp in the main chat.
 */
  checkAndUpdateThreadCount() {
    if (this.messages.length === 0 && this.currentMessageToOpen) {
      this.currentMessageToOpen.threadCount = 0;
      this.currentMessageToOpen.lastReplyTimestamp = null;
    }
    this.updateThreadInfoInMainChat();
  }

  /**
 * Updates thread info in the main chat based on the current message.
 */
  async updateThreadInfoInMainChat() {
    if (this.currentMessageToOpen?.id && this.currentMessageToOpen.chatId) {
      const { chatId, id: messageId } = this.currentMessageToOpen;

      await this.threadService.updateThreadInfo(
        chatId,
        messageId,
        this.currentMessageToOpen.threadCount!,
        this.currentMessageToOpen.lastReplyTimestamp ?? null
      );
    }
  }

  /**
 * Checks if the user can delete the specified message.
 */
  private canDeleteMessage(message: Message): boolean {
    return this.threadMessageHelper.canDeleteMessage(message, this.currentUserId);
  }

  /**
 * Deletes message attachments from storage.
 */
  async deleteMessageAttachments(message: Message): Promise<void> {
    await this.threadMessageHelper.deleteMessageAttachments(message.attachments || [], this.threadFileHelper);
  }

  /**
 * Deletes the message from the thread.
 */
  private deleteMessageFromThread(message: Message): Promise<void> {
    return this.threadMessageHelper.deleteMessageFromThread(message, this.threadService);
  }

  /**
   * Starts the editing process for a message.
   */
  startEditing(message: Message) {
    this.threadMessageHelper.startEditing(this, message);
  }

  /**
 * Saves the edited message.
 */
  saveEdit(message: Message) {
    this.threadMessageHelper.saveEdit(this, message);
  }

  /**
 * Cancels the editing process for a message.
 */
  cancelEdit() {
    this.threadMessageHelper.cancelEdit(this);
  }

  /**
 * Checks if a URL is an image based on its file extension.
 */
  isImage(url: string): boolean {
    const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    return imageTypes.some((type) =>
      url.split('?')[0].toLowerCase().endsWith(type)
    );
  }

  /**
 * Opens a file dialog for selecting attachments.
 */
  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  /**
 * Handles file input and validates the selected file.
 */
  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.manageErrorMessage(null);

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.validateFile(file)) {
        return;
      }

      this.handleFilePreview(file);
    }
  }

  /**
 * Validates the selected file before uploading.
 */
  validateFile(file: File): boolean {
    const result = this.threadFileHelper.isValidFile(file);
    if (!result.isValid) {
      this.manageErrorMessage(result.errorMessage ?? null);
    }
    return result.isValid;
  }

  /**
 * Creates a preview for the selected file.
 */
  async handleFilePreview(file: File): Promise<void> {
    this.previewUrl = await this.threadFileHelper.createFilePreview(file);
    this.attachmentUrl = null;
    this.selectedFile = file;
    this.manageErrorMessage(null);
  }

  /**
 * Manages error messages with an optional timeout.
 */
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

  /**
 * Removes the file preview from the message.
 */
  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.fileInput.nativeElement.value = '';
  }

  /**
 * Opens an overlay to display an image.
 */
  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  /**
 * Closes the image overlay.
 */
  closeOverlay() {
    this.overlayImageUrl = null;
  }

  /**
 * Loads metadata for a file attachment.
 */
  loadFileMetadata(attachmentUrl: string): void {
    this.threadFileHelper.loadFileMetadata(attachmentUrl).then((metadata) => {
      this.metadataMap[attachmentUrl] = metadata;
    });
  }

  /**
 * Logs metadata for an attachment in storage.
 */
  async logAttachmentMetadata(attachmentUrl: string) {
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
  }

  /**
 * Checks if metadata has been loaded for an attachment.
 */
  isMetadataLoaded(attachment: string): boolean {
    return !!this.metadataMap[attachment];
  }

  /**
 * Formats file size into a human-readable string.
 */
  formatFileSize(size: number): string {
    return this.threadFileHelper.formatFileSize(size);
  }

  /**
   * Toggles the emoji picker for a specific message.
   */
  toggleEmojiPicker(event: MouseEvent, message: Message) {
    event.stopPropagation();
    if (this.selectedMessage === message && this.showEmojiPicker) {
      this.showEmojiPicker = false;
      this.selectedMessage = null;
    } else {
      this.showEmojiPicker = true;
      this.selectedMessage = message;
      const windowHeight = window.innerHeight;
      const isBelow = event.clientY > windowHeight / 2;
      this.emojiMartPositionClass = isBelow ? 'open-above' : 'open-below';
      if (message.senderId === this.currentUserId) {
        this.emojiMartPositionClass += ' position-right';
      } else {
        this.emojiMartPositionClass += ' position-left';
      }
    }
  }

  /**
 * Closes the emoji picker when the mouse leaves the message.
 */
  onMouseLeave(event: MouseEvent, message: Message) {
    if (this.showEmojiPicker && this.selectedMessage === message) {
      this.showEmojiPicker = false;
      this.selectedMessage = null;
    }
    const relatedTarget = event.relatedTarget as HTMLElement;
    const menuComponent = this.messageMenuComponents.find(menuComp => menuComp.message.id === message.id);

    if (menuComponent && menuComponent.menuElementRef) {
      const menuElement = menuComponent.menuElementRef.nativeElement;
      if (!menuElement.contains(relatedTarget) && !menuComponent.isMouseOverMenu) {
        menuComponent.closeMenu();
      }
    }
  }

  /**
 * Toggles the emoji picker for the message box.
 */
  toggleMessageBoxEmojiPicker() {
    this.showMessageBoxEmojiPicker = !this.showMessageBoxEmojiPicker;
  }

  /**
 * Adds an emoji to the message box text.
 */
  addEmojiToMessageBox(event: any) {
    this.newMessageText += event.emoji.native;
    this.showMessageBoxEmojiPicker = false;
    this.focusTextarea();
  }

  /**
 * Sets focus to the message input textarea.
 */
  focusTextarea() {
    if (this.messageTextarea && this.messageTextarea.nativeElement) {
      this.messageTextarea.nativeElement.focus();
    }
  }

  /**
   * Handles document click to close emoji picker and mention dropdown.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.showEmojiPicker && !target.closest('.emoji-mart-threadmessage')) {
      this.showEmojiPicker = false;
      this.selectedMessage = null;
    }
    if (
      this.showMessageBoxEmojiPicker &&
      !target.closest('.emoji-mart-thread-message-box') &&
      !target.closest('.emoji')
    ) {
      this.showMessageBoxEmojiPicker = false;
    }
    if (!target.closest('.mention-dropdown') && !target.closest('.messageBox textarea')) {
      this.showMentionDropdown = false;
    }
  }

  /**
 * Adds an emoji reaction to a message.
 */
  addEmoji(event: any, message: Message) {
    const emoji = event.emoji.native;
    this.addOrRemoveReaction(message, emoji);
    this.userService.addEmoji(emoji);
    this.showEmojiPicker = false;
  }

  /**
   * Toggles a reaction on or off for a message.
   */
  addOrRemoveReaction(message: Message, emoji: string): void {
    this.threadReactionHelper.toggleReaction(message, emoji, this.currentUserId);
    if (this.isOriginalMessage(message)) {
      if (this.currentMessageToOpen) {
        this.updateMessageReactions(this.currentMessageToOpen);
      }
    } else {
      this.updateMessageReactions(message);
    }
  }

  /**
   * Checks if a message is the original in the thread.
   */
  private isOriginalMessage(message: Message): boolean {
    return (
      this.currentMessageToOpen !== null &&
      message.id === this.currentMessageToOpen.id
    );
  }

  /**
 * Returns the count of reactions for a specific emoji.
 */
  getReactionCount(message: Message, emoji: string): number {
    return this.threadReactionHelper.getReactionCount(message, emoji);
  }

  /**
 * Updates message reactions in the current thread.
 */
  private async updateMessageReactions(message: Message): Promise<void> {
    const { chatId, id: messageId } = message;

    if (
      this.currentMessageToOpen &&
      message.id === this.currentMessageToOpen.id
    ) {
      await this.threadService.updateOriginalMessageReactions(
        chatId,
        this.currentMessageToOpen.id!,
        message.reactions || {}
      );
    } else {
      await this.threadService.updateThreadMessageReactions(
        chatId,
        this.threadService.currentMessageId,
        message.id!,
        message.reactions || {}
      );
    }
  }

  /**
 * Retrieves a tooltip with usernames for emoji reactions.
 */
  getTooltipContent(message: Message, emoji: string): string {
    const usernames = this.getReactionUsernames(message, emoji);
    const numUsers = usernames.length;

    if (numUsers > 3) {
      const displayedUsers = usernames.slice(0, 3).join(', ');
      const remainingUsers = numUsers - 3;
      return `
        <span class="emoji">${emoji}</span>
        <span class="username">${displayedUsers} und ${remainingUsers} weitere Personen</span>
        <span class="reaction-text">${numUsers > 1 ? 'haben' : 'hat'
        } reagiert</span>
      `;
    } else {
      const displayedUsers = usernames.join(', ');
      return `
        <span class="emoji">${emoji}</span>
        <span class="username">${displayedUsers}</span>
        <span class="reaction-text">${numUsers > 1 ? 'haben' : 'hat'
        } reagiert</span>
      `;
    }
  }

  /**
 * Returns a list of usernames who reacted with a specific emoji.
 */
  getReactionUsernames(message: Message, emoji: string): string[] {
    const userIds = message.reactions?.[emoji] || [];
    const usernames = userIds.map(
      (userId) => this.userProfiles[userId]?.name || 'Unknown'
    );
    return usernames;
  }

  /**
 * Clears the current error message.
 */
  clearErrorMessage() {
    this.manageErrorMessage(null);
  }


  /**
 * Handles text input and manages mention detection.
 */
  onTextareaInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPosition = textarea.selectionStart || 0;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);

    this.showMentionDropdown = false;
    this.mentionSearchTerm = '';

    const atIndex = textBeforeCursor.lastIndexOf('@');
    const isAtSymbol = atIndex >= 0 && (atIndex === 0 || /\s|\n/.test(textBeforeCursor.charAt(atIndex - 1)));

    if (isAtSymbol) {
      this.mentionSearchTerm = textBeforeCursor.substring(atIndex + 1);
      this.showMentionDropdown = true;
      this.mentionStartPosition = atIndex;
    }
  }

  /**
 * Inserts the selected user's name into the message box.
 */
  onUserSelected(user: User) {
    const textarea = this.messageTextarea.nativeElement;
    const cursorPosition = textarea.selectionStart || 0;
    const value = textarea.value;
    const beforeMention = value.substring(0, this.mentionStartPosition);
    const afterCursor = value.substring(cursorPosition);
    const newValue = `${beforeMention}@${user.name} ${afterCursor}`;
    this.newMessageText = newValue;

    setTimeout(() => {
      const newCursorPosition = (beforeMention + '@' + user.name + ' ').length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
      textarea.focus();
    }, 0);

    this.showMentionDropdown = false;
    this.mentionSearchTerm = '';
  }

  /**
   * Handles keyboard events for navigating the mention dropdown.
   */
  onTextareaKeydown(event: KeyboardEvent) {
    if (this.showMentionDropdown && this.mentionDropdownComponent) {
      if (event.key === 'Escape') {
        this.showMentionDropdown = false;
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        this.mentionDropdownComponent.moveSelectionDown();
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        this.mentionDropdownComponent.moveSelectionUp();
        event.preventDefault();
      } else if (event.key === 'Enter') {
        const selectedUser = this.mentionDropdownComponent.getSelectedUser();
        if (selectedUser) {
          this.onUserSelected(selectedUser);
          event.preventDefault();
        }
      }
    } else {
      if (event.key === 'Enter' && !event.shiftKey) {
        this.sendMessage(event);
        event.preventDefault();
      }
    }
  }

  /**
 * Inserts an '@' symbol in the message box and opens the mention dropdown.
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
 * Handles window resizing to close the thread on small screens.
 */
  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent): void {
    const windowWidth = (event.target as Window).innerWidth;

    if (windowWidth < 1300) {
      this.onCloseThread();
    }
  }

  /**
   * Initiates the download of the displayed PDF.
   * @param attachmentUrl - Die URL des PDFs
   */
  async downloadPdf(attachmentUrl: string): Promise<void> {
    await this.threadFileHelper.downloadPdf(attachmentUrl, this.metadataMap);
  }
}
