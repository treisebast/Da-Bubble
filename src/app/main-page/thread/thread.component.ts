import { Component, EventEmitter, inject, Output } from '@angular/core';
import { ChatUserProfile } from '../../shared/models/chat-user-profile.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { FieldValue, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {

  currentChat: ChatUserProfile | null = null;
  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  messages: Message[] = [];

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      console.log('Current Chat:', chat); // Debugging output
      this.currentChat = chat as ChatUserProfile;
    });

    this.threadService.currentThread$.subscribe(currentThread => {
      if (Array.isArray(currentThread)) {
        this.messages = currentThread;
      } else {
        this.messages = []; // Leeres Array setzen, wenn currentThread kein Array ist
      }
    });
  }

  @Output() closeThread = new EventEmitter<void>();

  onCloseThread() {
    this.closeThread.emit();
  }

  sendMessage() {
    // Logic to send a message
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
