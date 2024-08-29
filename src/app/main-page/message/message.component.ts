import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { Message } from '../../shared/models/message.model';
import { CommonModule } from '@angular/common';
import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { User } from '../../shared/models/user.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogOptionsComponent } from '../dialog-options/dialog-options.component';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, MatMenuModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})
export class MessageComponent implements OnInit {
  @Input() message!: Message;
  @Input() userProfile!: User;
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

  constructor(private chatService: ChatService, private dialog: MatDialog, private storageService: FirebaseStorageService) { }

  ngOnInit(): void {
    console.log('Message Attachments:', this.message.attachments);
    console.log('this Chat is Private:', this.isCurrentChatPrivate);

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

  openOptionsDialog() {
    const dialogRef = this.dialog.open(DialogOptionsComponent, {
      width: '250px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'edit') {
        this.editMessage();
      } else if (result === 'delete') {
        this.deleteMessage();
      }
    });
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
    if (size < 1024) return size + ' B';
    else if (size < 1048576) return (size / 1024).toFixed(2) + ' KB';
    else if (size < 1073741824) return (size / 1048576).toFixed(2) + ' MB';
    else return (size / 1073741824).toFixed(2) + ' GB';
  }
}
