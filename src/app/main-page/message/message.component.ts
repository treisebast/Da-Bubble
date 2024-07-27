import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Message } from '../../shared/models/message.model';
import { ChatUserProfile } from '../../shared/models/chat-user-profile.model';
import { CommonModule } from '@angular/common';
import { FieldValue, Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss']
})
export class MessageComponent implements OnInit {
  @Input() message!: Message;
  @Input() userProfile!: ChatUserProfile;
  @Input() isCurrentUser!: boolean;
  @Output() messageClicked = new EventEmitter<Message>();

  constructor() { }

  ngOnInit(): void { }

  convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }

  onMessageClick() {
    this.messageClicked.emit(this.message);
  }
}
