import { Component, EventEmitter, inject, Output } from '@angular/core';
import { ChatUserProfile } from '../../shared/models/chat-user-profile.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {

  currentChat: ChatUserProfile | Channel | null = null;
  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  messages: Message[] = [];
  newMessageText = '';
  currentMessageToOpen: any;

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      console.log('Current Chat:', chat); // Debugging output
      this.currentChat = chat as ChatUserProfile;
    });

    this.threadService.currentThread$.subscribe(currentThread => {
      if (Array.isArray(currentThread)) {
        this.messages = currentThread;
      } else {
        this.messages = [];
      }
    });

    this.threadService.getCurrentMessageToOpen().subscribe((chatMessage: Message | null) => {
      this.currentMessageToOpen = chatMessage;
    });
  }

  @Output() closeThread = new EventEmitter<void>();

  onCloseThread() {
    this.closeThread.emit();
  }

  sendMessage() {
    /*if (this.newMessageText.trim() === '') {
      return;
    }

    const newMessage: Message = {
      content: this.newMessageText,
      senderId: 'Current User',  // Hier sollte die aktuelle Benutzer-ID verwendet werden
      timestamp: serverTimestamp()
    };

    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
    });

    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      this.threadService.addThread(this.currentChat.id, this.threadService.currentMessageId, newMessage)
    }
    this.newMessageText = '';*/

    console.log(this.currentChat);
  }

  close() {
    // Logic to close the thread
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
