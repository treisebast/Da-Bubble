import { Component, Input, OnInit, Output, EventEmitter, HostListener, ElementRef, ViewChild, SimpleChanges, OnChanges } from '@angular/core';
import { Message } from '../../shared/models/message.model';
import { CommonModule } from '@angular/common';
import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { User } from '../../shared/models/user.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../../shared/services/user.service';
import { MessageMenuComponent } from './message-menu/message-menu.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, MatMenuModule, FormsModule, PickerModule, MatTooltipModule, MessageMenuComponent],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})
export class MessageComponent implements OnInit, OnChanges {
  @Input() message!: Message;
  @Input() userProfile: User | undefined;
  @Input() currentUserId!: string;
  @Input() isCurrentUser!: boolean;
  @Input() isCurrentChatPrivate!: boolean;
  @Output() messageClicked = new EventEmitter<Message>();
  @Output() senderId = new EventEmitter<string>();
  @Output() imageClicked = new EventEmitter<string>();
  @Input() messageIndex!: number;

  emojiMartPositionClass: string = '';
  screenSmall: boolean = false;
  isEditing: boolean = false;
  editContent: string = '';
  fileName: string = '';
  fileSize: number = 0;
  showEmojiPicker = false;
  showMobileEmojis: boolean = false;
  lastTwoEmojis: string[] = [];
  mobileEmojis: string[] = ['👍', '❤️', '😂', '😮'];
  usernames: { [emoji: string]: string[] } = {};
  showTooltip: string | null = null;
  userProfiles: { [userId: string]: User } = {};
  @ViewChild('emojiPickerContainer') emojiPickerContainer!: ElementRef;
  @ViewChild(MessageMenuComponent) messageMenuComponent!: MessageMenuComponent;
  @ViewChild('mobileMartContainer') mobileMartContainerRef!: ElementRef;
  @ViewChild('mobileMartButton') mobileMartButtonRef!: ElementRef;

  constructor(
    private chatService: ChatService,
    private elementRef: ElementRef,
    private userService: UserService,
    private storageService: FirebaseStorageService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {

    this.userService.lastTwoEmojis$.subscribe((emojis) => {
      this.lastTwoEmojis = emojis;
    });
    this.message.attachments?.forEach((attachment) => {
      if (!this.isImage(attachment)) {
        this.loadFileMetadata(attachment, this.message);
      }
    });
    this.loadReactionUsernames();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.loadReactionUsernames();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenWidth();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showEmojiPicker) {
      const emojiPickerElement = this.emojiPickerContainer?.nativeElement;
      if (emojiPickerElement && !emojiPickerElement.contains(event.target)) {
        this.showEmojiPicker = false;
      }
    }

    if (this.showMobileEmojis) {
      const mobileMartContainerElement = this.mobileMartContainerRef?.nativeElement;
      const mobileMartButtonElement = this.mobileMartButtonRef?.nativeElement;

      if (
        mobileMartContainerElement &&
        !mobileMartContainerElement.contains(event.target) &&
        mobileMartButtonElement &&
        !mobileMartButtonElement.contains(event.target)
      ) {
        this.showMobileEmojis = false;
      }
    }
  }

  checkScreenWidth() {
    this.screenSmall = window.innerWidth <= 600;
  }

  convertToDate(timestamp: Timestamp | FieldValue | undefined): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }

  onMessageClick() {
    this.messageClicked.emit(this.message);
  }

  startEditing() {
    this.isEditing = true;
    this.editContent = this.message.content;
  }

  saveEdit() {
    const hasAttachments = this.message.attachments && this.message.attachments.length > 0;
    if (this.editContent.trim() !== '' || hasAttachments) {
      this.chatService.editMessage(this.message.id!, this.editContent);
    }
    this.isEditing = false;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  editMessage() {
    if (this.isCurrentUser) {
      this.startEditing();
    }
  }

  deleteMessage() {
    if (this.isCurrentUser) {
      this.chatService.deleteMessage(this.message.id!);
    } else {
      console.error(
        'Du kannst die Nachricht eines anderen Benutzers nicht löschen.'
      );
    }
  }

  isImage(url: string): boolean {
    const imageTypes = ['.png', '.jpg', '.jpeg'];
    return imageTypes.some((type) => url.split('?')[0].endsWith(type));
  }

  openProfilePopup(Id: string | undefined) {
    console.log(Id);
    this.senderId.emit(Id);
  }

  onImageClick(imageUrl: string) {
    this.imageClicked.emit(imageUrl);
  }

  loadFileMetadata(url: string, message: Message) {
    this.storageService.getFileMetadata(url).subscribe(
      (metadata) => {
        if (!message.metadata) {
          message.metadata = {};
        }
        message.metadata[url] = {
          name: metadata.name,
          size: metadata.size,
        };
      },
      (error) => {
        console.error('Fehler beim Abrufen der Metadaten:', error);
      }
    );
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return size + ' B';
    } else {
      return (size / 1024).toFixed(2) + ' KB';
    }
  }

  // Emoji reactions //

  toggleEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;

    if (this.showEmojiPicker) {
      const windowHeight = window.innerHeight;
      const isBelow = event.clientY > windowHeight / 2;
      this.emojiMartPositionClass = isBelow ? 'open-above' : 'open-below';
      this.emojiMartPositionClass += this.isCurrentUser ? ' position-left' : ' position-right';
    }
  }

  onMouseLeave(event: MouseEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (
      this.messageMenuComponent &&
      this.messageMenuComponent.menuElementRef &&
      !this.messageMenuComponent.menuElementRef.nativeElement.contains(relatedTarget)
    ) {
      this.messageMenuComponent.closeMenu();
    }
  }

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.addReaction(this.message, emoji, this.currentUserId);
    this.userService.addEmoji(emoji);
    this.showEmojiPicker = false;
  }

  addReaction(message: Message, emoji: string, userId: string) {
    if (!message.reactions) {
      message.reactions = {};
    }
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    const userIndex = message.reactions[emoji].indexOf(userId);
    if (userIndex === -1) {
      message.reactions[emoji].push(userId);
    } else {
      message.reactions[emoji].splice(userIndex, 1);
    }
    if (message.reactions[emoji].length === 0) {
      delete message.reactions[emoji];
    }

    this.chatService.updateMessageReactions(this.message).then(() => {
      this.loadReactionUsernames();
    });
  }

  addOrRemoveReaction(emoji: string) {
    const userId = this.currentUserId;
    let reactionAdded = false;

    if (!this.message.reactions) {
      this.message.reactions = {};
    }

    if (this.message.reactions[emoji]?.includes(userId)) {
      this.message.reactions[emoji] = this.message.reactions[emoji].filter(
        (id) => id !== userId
      );
      if (this.message.reactions[emoji].length === 0) {
        delete this.message.reactions[emoji];
      }
    } else {
      if (!this.message.reactions[emoji]) {
        this.message.reactions[emoji] = [];
      }
      this.message.reactions[emoji].push(userId);
      reactionAdded = true;
    }

    this.chatService.updateMessageReactions(this.message).then(() => {
      this.loadReactionUsernames();
      if (reactionAdded) {
        this.userService.addEmoji(emoji);
      }
    });
  }

  toggleMobileEmojis() {
    this.showMobileEmojis = !this.showMobileEmojis;
  }

  onMobileEmojiClick(emoji: string): void {
    this.addOrRemoveReaction(emoji);
  }

  getReactionCount(emoji: string): number {
    return this.message.reactions?.[emoji]?.length || 0;
  }

  getReactionUsernames(emoji: string): string[] {
    return this.usernames[emoji] || [];
  }

  loadReactionUsernames(): void {
    if (this.message.reactions) {
      Object.keys(this.message.reactions).forEach((emoji: string) => {
        const userIds: string[] | undefined = this.message.reactions?.[emoji];
        if (userIds && userIds.length > 0) {
          this.userService.getUsersOnce(userIds).subscribe({
            next: (users: User[]) => {
              this.usernames[emoji] = users.map(user => user?.name || 'Unknown');
              users.forEach((user: User) => {
                if (user && user.userId) {
                  this.userProfiles[user.userId] = user;
                }
              });
            },
          });
        }
      });
    }
  }

  /**
    * Reaction-Tooltip mit dynamischem Text basierend auf den Reaktionen.
    */
  getTooltipContent(emoji: string): SafeHtml {
    const userIds: string[] = this.message.reactions?.[emoji] || [];
    const hasCurrentUserReacted: boolean = userIds.includes(this.currentUserId);

    // Erstellen einer Liste von Benutzernamen, wobei der aktuelle Benutzer durch 'Du' ersetzt wird
    const displayUsernames: string[] = userIds.map((userId: string): string => {
      if (userId === this.currentUserId) {
        return 'Du';
      }
      return this.userProfiles[userId]?.name || 'Unknown';
    });

    const numUsers: number = userIds.length;

    let usernames: string;
    let reactionText: string;

    if (hasCurrentUserReacted) {
      const otherUsernames = displayUsernames.filter(username => username !== 'Du');
      usernames = this.getUsernamesWhenCurrentUserReacted(otherUsernames);
      reactionText = this.getReactionText(userIds.length, hasCurrentUserReacted);
    } else {
      usernames = this.getUsernamesWhenCurrentUserDidNotReact(displayUsernames);
      reactionText = this.getReactionText(userIds.length, hasCurrentUserReacted);
    }

    // Generieren des Tooltip-HTML-Inhalts
    const tooltipHtml = this.generateTooltipHtml(emoji, usernames, reactionText);

    // Fallback, falls keine Bedingungen erfüllt sind (z.B. keine Reaktionen)
    const fallbackHtml = this.generateTooltipHtml(
      emoji,
      'Keine Reaktionen',
      'haben reagiert'
    );

    return tooltipHtml || this.sanitizer.bypassSecurityTrustHtml(fallbackHtml);
  }

  /**
   * Erstellt den HTML-Inhalt des Tooltips.
   */
  private generateTooltipHtml(emoji: string, usernames: string, reactionText: string): string {
    return `
    <span class="emoji">${emoji}</span>
    <span class="username">${usernames}</span>
    <span class="reaction-text">${reactionText}</span>
  `;
  }

  /**
   * Bestimmt die Anzeigereihenfolge der Benutzernamen, wenn der aktuelle Benutzer reagiert hat.
   */
  private getUsernamesWhenCurrentUserReacted(otherUsers: string[]): string {
    const numOtherUsers = otherUsers.length;

    if (numOtherUsers === 0) {
      return 'Du';
    } else if (numOtherUsers === 1) {
      const otherUsername = otherUsers[0] || 'Unknown';
      return `Du und ${otherUsername}`;
    } else {
      return `Du und ${numOtherUsers} weitere Personen`;
    }
  }

  /**
   * Bestimmt die Anzeigereihenfolge der Benutzernamen, wenn der aktuelle Benutzer nicht reagiert hat.
   */
  private getUsernamesWhenCurrentUserDidNotReact(displayUsernames: string[]): string {
    const numUsers = displayUsernames.length;

    if (numUsers === 1) {
      return displayUsernames[0];
    } else if (numUsers === 2) {
      return `${displayUsernames[0]} und ${displayUsernames[1]}`;
    } else {
      const displayedUsers = displayUsernames.slice(0, 2).join(', ');
      const remainingUsers = numUsers - 2;
      return `${displayedUsers} und ${remainingUsers} weitere Personen`;
    }
  }

  /**
   * Bestimmt den Reaktionstext basierend auf der Anzahl der Benutzer.
   */
  private getReactionText(numUsers: number, isCurrentUserReacted: boolean): string {
    if (isCurrentUserReacted && numUsers === 1) {
      return 'hast reagiert';
    } else {
      return numUsers > 1 ? 'haben reagiert' : 'hat reagiert';
    }
  }
}
