import { Component, EventEmitter, inject, Output, OnInit } from '@angular/core';
import { ChatUserProfile } from '../../shared/models/chat-user-profile.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss']
})
export class ThreadComponent implements OnInit {
  currentChat: ChatUserProfile | Channel | null = null;
  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  private authService = inject(AuthService);

  messages: Message[] = [];
  newMessageText = '';
  currentMessageToOpen: any;
  currentUserId = '';
  currentUserName = '';

  ngOnInit() {
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || '';
      }
    });

    this.threadService.getCurrentMessageToOpen().subscribe((chatMessage: Message | null) => {
      this.currentMessageToOpen = chatMessage;
    });

    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat as ChatUserProfile;
    });

    this.threadService.currentThread$.subscribe(currentThread => {
      if (Array.isArray(currentThread)) {
        this.messages = this.sortMessagesByTimestamp(currentThread);
      } else {
        this.messages = [];
      }
    });
  }

  @Output() closeThread = new EventEmitter<void>();

  onCloseThread() {
    this.closeThread.emit();
  }

  sendMessage() {
    if (this.newMessageText.trim() === '') {
      return;
    }

    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserName,
      timestamp: serverTimestamp()
    };

    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      this.threadService.addThread(this.currentChat.id, this.threadService.currentMessageId, newMessage);
    }
    this.newMessageText = '';
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

  convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }
}
