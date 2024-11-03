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
    this.checkScreenWidth();
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


  /**
 * Lifecycle hook that is called when any data-bound property changes.
 * @param changes - Object of changed properties
 */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.loadReactionUsernames();
    }
  }


  /**
 * Handles window resize events to check screen width.
 * @param event - The resize event
 */
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenWidth();
  }


  /**
 * Handles document click events to manage the visibility of emoji pickers.
 * Closes the emoji pickers if the click is outside their containers.
 * @param event - The mouse event that occurred
 */
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


  /**
 * Checks the current screen width and updates the `screenSmall` flag.
 */
  checkScreenWidth() {
    this.screenSmall = window.innerWidth <= 600;
  }


  /**
 * Converts a timestamp or field value to a Date object.
 * @param timestamp - The timestamp or field value to convert
 * @returns The corresponding Date object
 */
  convertToDate(timestamp: Timestamp | FieldValue | undefined): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }


  /**
 * Emits an event when the message is clicked.
 */
  onMessageClick() {
    this.messageClicked.emit(this.message);
  }


  /**
 * Initiates the editing mode for the message.
 */
  startEditing() {
    this.isEditing = true;
    this.editContent = this.message.content;
  }


  /**
 * Saves the edited message content.
 * Updates the message if there are changes or attachments.
 */
  saveEdit() {
    const hasAttachments = this.message.attachments && this.message.attachments.length > 0;
    if (this.editContent.trim() !== '' || hasAttachments) {
      this.chatService.editMessage(this.message.id!, this.editContent);
    }
    this.isEditing = false;
  }


  /**
 * Cancels the editing mode without saving changes.
 */
  cancelEdit() {
    this.isEditing = false;
  }


  /**
 * Initiates the message editing process if the current user is the owner.
 */
  editMessage() {
    if (this.isCurrentUser) {
      this.startEditing();
    }
  }


  /**
 * Deletes the message if the current user is the owner.
 */
  deleteMessage() {
    if (this.isCurrentUser) {
      this.chatService.deleteMessage(this.message.id!);
    }
  }


  /**
 * Determines if a given URL points to an image based on its extension.
 * @param url - The URL to check
 * @returns `true` if the URL is an image, otherwise `false`
 */
  isImage(url: string): boolean {
    const imageTypes = ['.png', '.jpg', '.jpeg'];
    return imageTypes.some((type) => url.split('?')[0].endsWith(type));
  }


  /**
 * Opens the profile popup for a user.
 * @param Id - The ID of the user whose profile is to be opened
 */
  openProfilePopup(Id: string | undefined) {
    // console.log(Id);
    this.senderId.emit(Id);
  }


  /**
 * Emits an event when an image is clicked.
 * @param imageUrl - The URL of the clicked image
 */
  onImageClick(imageUrl: string) {
    this.imageClicked.emit(imageUrl);
  }


  /**
 * Loads metadata for a file attachment and updates the message object.
 * @param url - The URL of the file
 * @param message - The message containing the attachment
 */
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
      }
    );
  }


  /**
 * Formats a file size in bytes to a more readable string.
 * @param size - The size of the file in bytes
 * @returns The formatted file size string
 */
  formatFileSize(size: number): string {
    if (size < 1024) {
      return size + ' B';
    } else {
      return (size / 1024).toFixed(2) + ' KB';
    }
  }


  /**
 * Toggles the visibility of the emoji picker.
 * Adjusts the position class based on the click position and user.
 * @param event - The mouse event that triggered the toggle
 */
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


  /**
 * Handles mouse leave events to close the message menu if the mouse is not over it.
 * @param event - The mouse event that occurred
 */
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


  /**
 * Adds an emoji reaction to the message.
 * @param event - The event containing the selected emoji
 */
  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.addReaction(this.message, emoji, this.currentUserId);
    this.userService.addEmoji(emoji);
    this.showEmojiPicker = false;
  }


  /**
 * Adds or removes a reaction from a message based on user interaction.
 * @param message - The message to update
 * @param emoji - The emoji to add or remove
 * @param userId - The ID of the user reacting
 */
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


  /**
 * Adds or removes a reaction based on user interaction.
 * @param emoji - The emoji to toggle
 */
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


/**
 * Toggles the visibility of mobile emojis.
 */
  toggleMobileEmojis() {
    this.showMobileEmojis = !this.showMobileEmojis;
  }


  /**
 * Handles clicks on mobile emojis by adding or removing reactions.
 * @param emoji - The emoji that was clicked
 */
  onMobileEmojiClick(emoji: string): void {
    this.addOrRemoveReaction(emoji);
  }


  /**
 * Retrieves the count of reactions for a specific emoji.
 * @param emoji - The emoji to get the reaction count for
 * @returns The number of reactions for the emoji
 */
  getReactionCount(emoji: string): number {
    return this.message.reactions?.[emoji]?.length || 0;
  }


  /**
 * Retrieves the usernames of users who reacted with a specific emoji.
 * @param emoji - The emoji to get usernames for
 * @returns An array of usernames who reacted with the emoji
 */
  getReactionUsernames(emoji: string): string[] {
    return this.usernames[emoji] || [];
  }


  /**
 * Loads the usernames of users who reacted to the message.
 */
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
 * Generates tooltip content based on emoji reactions.
 * @param emoji - The emoji to generate the tooltip for
 * @returns The HTML content for the tooltip
 */
  getTooltipContent(emoji: string): SafeHtml {
    const userIds: string[] = this.message.reactions?.[emoji] || [];
    const hasCurrentUserReacted: boolean = userIds.includes(this.currentUserId);
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

    const tooltipHtml = this.generateTooltipHtml(emoji, usernames, reactionText);
    const fallbackHtml = this.generateTooltipHtml(
      emoji,
      'Keine Reaktionen',
      'haben reagiert'
    );
    return tooltipHtml || this.sanitizer.bypassSecurityTrustHtml(fallbackHtml);
  }


/**
 * Creates the HTML content for the tooltip.
 * @param emoji - The emoji to display
 * @param usernames - The usernames to display
 * @param reactionText - The reaction text to display
 * @returns The generated HTML string for the tooltip
 */
  private generateTooltipHtml(emoji: string, usernames: string, reactionText: string): string {
    return `
    <span class="emoji">${emoji}</span>
    <span class="username">${usernames}</span>
    <span class="reaction-text">${reactionText}</span>
  `;
  }


/**
 * Determines the display order of usernames when the current user has reacted.
 * @param otherUsers - The list of other users who have reacted
 * @returns A formatted string of usernames
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
 * Determines the display order of usernames when the current user has not reacted.
 * @param displayUsernames - The list of usernames to display
 * @returns A formatted string of usernames
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
 * Determines the reaction text based on the number of users.
 * @param numUsers - The number of users who reacted
 * @param isCurrentUserReacted - Whether the current user has reacted
 * @returns The appropriate reaction text
 */
  private getReactionText(numUsers: number, isCurrentUserReacted: boolean): string {
    if (isCurrentUserReacted && numUsers === 1) {
      return 'hast reagiert';
    } else {
      return numUsers > 1 ? 'haben reagiert' : 'hat reagiert';
    }
  }

   /**
   * Initiates the download of the displayed PDF.
   * @param attachmentUrl - Die URL des PDFs
   */
   async downloadPdf(attachmentUrl: string) {
    if (!attachmentUrl) return;

    try {
      // Hole den Download-Link direkt
      const response = await fetch(attachmentUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Netzwerkantwort war nicht ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Extrahiere den Dateinamen aus den Metadaten oder der URL
      const attachmentName = this.message.metadata?.[attachmentUrl]?.name || this.extractFileName(attachmentUrl, blob.type) || 'downloaded-file.pdf';

      const link = document.createElement('a');
      link.href = url;
      link.download = attachmentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Freigeben der Blob-URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Fehler beim Herunterladen des PDFs:', error);
      alert('Das PDF konnte nicht heruntergeladen werden. Bitte versuche es später erneut.');
    }
  }

  /**
   * Extrahiert einen kürzeren und sinnvollen Dateinamen aus der imageUrl oder attachmentUrl.
   * @param url - Die URL der Datei
   * @param mimeType - Der MIME-Typ des Blobs
   * @returns Ein string, der den Dateinamen darstellt
   */
  private extractFileName(url: string, mimeType: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname; // z.B. /v0/b/bucket/o/chat-files%2FgVM7hDPl0aS1E4Tlou92%2Ffilename.pdf%2Fanotherfile
      const path = decodeURIComponent(pathname); // /v0/b/bucket/o/chat-files/gVM7hDPl0aS1E4Tlou92/filename.pdf/anotherfile

      // Teile den Pfad in Segmente
      const segments = path.split('/');
      let filename = 'downloaded-file.pdf';

      // Iteriere rückwärts durch die Segmente, um das letzte Segment mit einer Dateiendung zu finden
      for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i].includes('.')) {
          filename = segments[i].split('?')[0];
          break;
        }
      }

      // Falls kein Dateiname gefunden wurde, setze einen Standardnamen mit der richtigen Erweiterung
      if (!filename.includes('.')) {
        const extension = mimeType.split('/')[1] || 'pdf';
        filename = `file.${extension}`;
      }

      return filename;
    } catch (e) {
      console.error('Fehler beim Extrahieren des Dateinamens:', e);
      return 'downloaded-file.pdf';
    }
  }
}
