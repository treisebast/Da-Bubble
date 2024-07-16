import { AfterViewChecked, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatUserProfile } from '../../../shared/models/chat-user-profile.model';
import { Channel } from '../../../shared/models/channel.model';
import { ChatServiceService } from '../../../shared/services/chat-service.service';

interface Message {
  user: string;
  date: Date;
  time: Date;
  message: string;
  likes: number;
}

@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss']
})
export class ChatMainComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  currentChat: ChatUserProfile | Channel | null = null;
  messages: Message[] = [];

  newMessageText = '';
  constructor(private chatService: ChatServiceService) {}

  isNewDay(date: Date, index: number): boolean {
    if (index === 0) return true;
    const prevDate = new Date(this.messages[index - 1].date);
    const currentDate = new Date(date);
    return prevDate.toDateString() !== currentDate.toDateString();
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
      user: 'Current User',
      date: new Date(),
      time: new Date(),
      message: this.newMessageText,
      likes: 0
    };

    this.chatService.addMessage(this.currentChat?.name || 'Current User', newMessage.message);
    this.newMessageText = '';
  }

  isChatUserProfile(chat: ChatUserProfile | Channel): chat is ChatUserProfile {
    return (chat as ChatUserProfile).imgScr !== undefined;
  }
}
