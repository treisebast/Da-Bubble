import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../shared/models/channel.model';
import { Message } from '../../shared/models/message.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { AuthService } from '../../shared/services/auth.service';
import { Timestamp, FieldValue, serverTimestamp } from '@angular/fire/firestore';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MessageComponent } from '../message/message.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import localeDe from '@angular/common/locales/de';

@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MessageComponent, MatProgressSpinnerModule],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss']
})
export class ChatMainComponent implements OnInit, AfterViewChecked {
  currentChat: any = null;
  messages: Message[] = [];
  currentThreadData: any;
  selectedChat: boolean = false;
  hoverStates: { [key: string]: boolean } = {};
  newMessageText = '';
  currentUserId = '';
  currentUserName = '';
  userProfiles: { [key: string]: any } = {};
  isLoading: boolean = false;

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private threadService: ThreadService
  ) {
    registerLocaleData(localeDe);
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

  ngOnInit() {
    this.isLoading = true;
    console.log("ngOnInit starts...isLoading = ", this.isLoading)
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || '';
      }
    });

    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
      if (this.currentChat) {
        this.loadMessages();
      }
    });
    this.chatService.selectedChat$.subscribe(chat => {
      this.selectedChat = chat;
    });
    this.isLoading = false;
    console.log("ngOnInit over...isLoading = ", this.isLoading)
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

  loadMessages() {
    this.isLoading = true;
    console.log("loading Messages...isLoading = ", this.isLoading)
    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      console.log("loading messages for Channel", `"${this.currentChat.name}"`);
      console.log("getMessages from chatService gets called now...")
      this.chatService.getMessages(this.currentChat.id).subscribe((messages: Message[]) => {
        this.messages = messages.sort((a, b) => this.convertToDate(a.timestamp).getTime() - this.convertToDate(b.timestamp).getTime());
        this.loadUserProfiles();
        if (this.messages && this.userProfiles) {
          this.isLoading = false;
          console.log("loading messages is over, isLoading = ", this.isLoading)
          setTimeout(() => this.scrollToBottom(), 100);
        }
      });
    }
  }

  loadUserProfiles() {
    const userIds = [...new Set(this.messages.map(message => message.senderId))];
    userIds.forEach(userId => {
      this.userService.getUser(userId).subscribe((user: User) => {
        this.userProfiles[userId] = {
          name: user.name,
          avatar: user.avatar,
          status: user.status === 'online'
        };
      });
    });
  }

  sendMessage(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    if (this.newMessageText.trim() === '') {
      return;
    }

    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat.id
    };

    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      this.chatService.addMessage(this.currentChat.id, newMessage);
    }
    this.newMessageText = '';
  }

  isChatUserProfile(chat: User | Channel): chat is User {
    return (chat as User).avatar !== undefined;
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

  onMouseEnter(propertyName: string) {
    this.hoverStates[propertyName] = true;
  }

  onMouseLeave(propertyName: string) {
    this.hoverStates[propertyName] = false;
  }

  getUserName(senderId: string): string {
    return this.userProfiles[senderId]?.name || 'Unknown User';
  }
}
