import { AfterViewChecked, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../shared/models/channel.model';
import { ChatUserProfile } from '../../shared/models/chat-user-profile.model';
import { Message } from '../../shared/models/message.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { Timestamp, FieldValue, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss']
})
export class ChatMainComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  currentChat: any = null;
  messages: Message[] = [];
  currentThreadData: any;
  private threadService = inject(ThreadService);


  newMessageText = '';
  constructor(private chatService: ChatService) { }

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

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
    });
    this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll to bottom failed:', err);
    }
  }

  sendMessage() {
    if (this.newMessageText.trim() === '') {
      return;
    }

    const newMessage: Message = {
      content: this.newMessageText,
      senderId: 'Current User',  // Hier sollte die aktuelle Benutzer-ID verwendet werden
      timestamp: serverTimestamp()
    };

    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      this.chatService.addMessage(this.currentChat.id, newMessage);
    }
    this.newMessageText = '';
  }

  isChatUserProfile(chat: ChatUserProfile | Channel): chat is ChatUserProfile {
    return (chat as ChatUserProfile).imgScr !== undefined;
  }

  async openThread(message: Message) {
    this.chatService.setChannelTrue();
    if (!message || !message.id) {
      console.error('Invalid message object:', message);
      return;
    }
    this.threadService.getThreads(this.currentChat.id, message.id)
      .subscribe(currentThread => {
        this.currentThreadData = currentThread;
        this.threadService.setCurrentThread(currentThread);
        if (message.id) {
          this.threadService.currentMessageId = message.id;
          this.threadService.setCurrentMessageToOpen(message);
        }
      });
      
  }
}
