import { Component, Input, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import { Message } from '../../shared/models/message.model';
import { CommonModule } from '@angular/common';
import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { User } from '../../shared/models/user.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { DialogEditMessageComponent } from '../dialog-edit-message/dialog-edit-message.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogOptionsComponent } from '../dialog-options/dialog-options.component';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule,MatMenuModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss']
})
export class MessageComponent implements OnInit {
  @Input() message!: Message;
  @Input() userProfile!: User;
  @Input() isCurrentUser!: boolean;
  @Output() messageClicked = new EventEmitter<Message>();


  screenSmall: boolean = false;

  constructor(private chatService: ChatService, private dialog: MatDialog) { }

  ngOnInit(): void { }

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
      width: '250px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'edit') {
        this.editMessage();
      } else if (result === 'delete') {
        this.deleteMessage();
      }
    });
  }

  editMessage() {
    if (this.message.chatId && this.message.id) {
      const dialogRef = this.dialog.open(DialogEditMessageComponent, {
        width: '300px',
        data: { content: this.message.content }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result !== undefined && result.trim() !== '') {
          this.chatService.editMessage(this.message.chatId!, this.message.id!, result);
        }
      });
    } else {
      console.error('chatId oder messageId ist undefined');
    }
  }
  


  deleteMessage() {
    if (this.message.chatId && this.message.id) {
      if (confirm("Möchtest du diese Nachricht wirklich löschen?")) {
        this.chatService.deleteMessage(this.message.chatId, this.message.id);
      }
    } else {
      console.error("chatId oder messageId ist undefined");
    }
  }

}
