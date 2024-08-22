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
  @Output() messageClicked = new EventEmitter<Message>();

  screenSmall: boolean = false;
  isEditing: boolean = false;
  editContent: string = '';

  constructor(private chatService: ChatService, private dialog: MatDialog) {}

  ngOnInit(): void {
    console.log('Message Attachments:', this.message.attachments);
    this.message.attachments?.forEach((attachment) => {
      console.log('Attachment:', attachment);
      console.log(
        'Is Image:',
        attachment.endsWith('.png') ||
          attachment.endsWith('.jpg') ||
          attachment.endsWith('.jpeg')
      );
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
        this.editContent
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
      this.chatService.deleteMessage(this.message.chatId!, this.message.id!);
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
}
