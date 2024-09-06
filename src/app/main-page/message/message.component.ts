import { Component, Input, OnInit, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { Message } from '../../shared/models/message.model';
import { CommonModule } from '@angular/common';
import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { User } from '../../shared/models/user.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../../shared/services/user.service';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, MatMenuModule, FormsModule, PickerModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})

export class MessageComponent implements OnInit {
  @Input() message!: Message;
  @Input() userProfile!: User;
  @Input() currentUserId!: string;
  @Input() isCurrentUser!: boolean;
  @Input() isCurrentChatPrivate!: boolean;
  @Output() messageClicked = new EventEmitter<Message>();
  @Output() senderId = new EventEmitter<string>();
  @Output() imageClicked = new EventEmitter<string>();

  screenSmall: boolean = false;
  isEditing: boolean = false;
  editContent: string = '';
  fileName: string = '';
  fileSize: number = 0;
  showEmojiPicker = false;
  lastTwoEmojis: string[] = [];
  private emojiCloseTimeout: any;

  constructor(
    private chatService: ChatService,
    private elementRef: ElementRef,
    private userService: UserService,
    private storageService: FirebaseStorageService
  ) { }

  ngOnInit(): void {
    console.log('Message Attachments:', this.message.attachments);
    console.log('this Chat is Private:', this.isCurrentChatPrivate);
    this.loadGlobalEmojis();
    this.message.attachments?.forEach((attachment) => {
      if (!this.isImage(attachment)) {
        this.loadFileMetadata(attachment, this.message);
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenWidth();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);

    if (!clickedInside && this.showEmojiPicker) {
      this.showEmojiPicker = false;
    }
  }

  checkScreenWidth() {
    this.screenSmall = window.innerWidth <= 500;
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
    if (this.editContent.trim() !== '') {
      this.chatService.editMessage(
        this.message.chatId!,
        this.message.id!,
        this.editContent,
        this.isCurrentChatPrivate
      );
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
      this.chatService.deleteMessage(
        this.message.chatId!,
        this.message.id!,
        this.isCurrentChatPrivate
      );
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
    this.storageService.getFileMetadata(url).subscribe(metadata => {
      if (!message.metadata) {
        message.metadata = {};
      }
      message.metadata[url] = {
        name: metadata.name,
        size: metadata.size
      };
    }, error => {
      console.error('Fehler beim Abrufen der Metadaten:', error);
    });
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return size + ' B';
    } else {
      return (size / 1024).toFixed(2) + ' KB';
    }
  }

  // Emoji reactions //

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    const userId = this.currentUserId;

    this.addReaction(this.message, emoji, userId);
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
    this.chatService.updateMessageReactions(message);
    this.userService.addEmoji(emoji);
    this.loadGlobalEmojis();
  }

  addOrRemoveReaction(emoji: string) {
    const userId = this.currentUserId;
    if (!this.message.reactions) {
      this.message.reactions = {};
    }
    if (this.message.reactions[emoji]?.includes(userId)) {
      this.message.reactions[emoji] = this.message.reactions[emoji].filter(id => id !== userId);
      if (this.message.reactions[emoji].length === 0) {
        delete this.message.reactions[emoji];
      }
    } else {
      if (!this.message.reactions[emoji]) {
        this.message.reactions[emoji] = [];
      }
      this.message.reactions[emoji].push(userId);
    }
    this.chatService.updateMessageReactions(this.message);
  }

  getReactionCount(emoji: string): number {
    return this.message.reactions?.[emoji]?.length || 0;
  }

  loadGlobalEmojis() {
    this.lastTwoEmojis = this.userService.getLastTwoEmojis();
  }
}
