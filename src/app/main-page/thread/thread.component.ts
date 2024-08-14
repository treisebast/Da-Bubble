import { Component, EventEmitter, inject, Output, OnInit } from '@angular/core';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss']
})
export class ThreadComponent implements OnInit {
  currentChat: User | Channel | null = null;
  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  messages: Message[] = [];
  newMessageText = '';
  currentMessageToOpen: any;
  currentUserId = '';
  currentUserName = '';
  userNames: { [key: string]: string } = {};
  userProfiles: { [key: string]: User } = {};
  totalReplies: number = 0;

  ngOnInit() {
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || '';
      }
    });

    this.threadService.getCurrentMessageToOpen().subscribe((chatMessage: Message | null) => {
      this.currentMessageToOpen = chatMessage;
      if (chatMessage) {
        this.resolveUserName(chatMessage.senderId);

        if (this.currentChat && 'id' in this.currentChat && chatMessage.id) {
          const chatId = this.currentChat.id ?? '';
          this.threadService.watchMessageChanges(chatId, chatMessage.id)
            .subscribe(updatedMessage => {
              this.currentMessageToOpen = updatedMessage;
            });
        }
      }
    });

    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat as User;
    });

    this.threadService.currentThread$.subscribe(currentThread => {
      if (Array.isArray(currentThread)) {
        this.messages = this.sortMessagesByTimestamp(currentThread);
        this.resolveUserNames(this.messages);
        this.loadUserProfiles(this.messages);
        this.totalReplies = this.messages.length;
      } else {
        this.messages = [];
      }
    });
  }

  @Output() closeThread = new EventEmitter<void>();

  onCloseThread() {
    this.closeThread.emit();
  }

/**
 * Sends a new message if the message text is not empty. Retrieves the current user's name
 * and constructs a new message object. If the message is part of a chat, it is added to the 
 * appropriate thread.
 * @async
 * @returns {Promise<void>} Resolves when the message has been sent or if the message text is empty.
 */
async sendMessage(event?: Event) {
  if (event) {
    event.preventDefault();  // Verhindert den Zeilenumbruch
  }

  if (this.newMessageText.trim() === '') {
    return;
  }

  const userName = await this.userService.getUserNameById(this.currentUserId);

  let chatId: string = '';
  if (this.currentChat && 'id' in this.currentChat && (this.currentChat as Channel).id) {
    chatId = (this.currentChat as Channel).id || '';
  }

  const newMessage: Message = {
    content: this.newMessageText,
    senderId: this.currentUserId,
    senderName: userName,
    timestamp: serverTimestamp(),
    chatId: chatId
  };

  if (chatId) {
    this.threadService.addThread(chatId, this.threadService.currentMessageId, newMessage);
  }
  this.newMessageText = '';
}

  

  /**
   * Sorts messages by their timestamp.
   * @param {Message[]} messages - The messages to sort.
   * @returns {Message[]} The sorted messages.
   */
  sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      const dateA = this.convertToDate(a.timestamp);
      const dateB = this.convertToDate(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Determines if the message is on a new day compared to the previous message.
   * @param {Timestamp | FieldValue} timestamp - The timestamp of the current message.
   * @param {number} index - The index of the current message.
   * @returns {boolean} True if the message is on a new day, false otherwise.
   */
  isNewDay(timestamp: Timestamp | FieldValue, index: number): boolean {
    if (index === 0) return true;
    const prevDate = this.convertToDate(this.messages[index - 1].timestamp);
    const currentDate = this.convertToDate(timestamp);
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  /**
   * Converts a Firestore timestamp to a JavaScript Date object.
   * @param {Timestamp | FieldValue} timestamp - The Firestore timestamp.
   * @returns {Date} The JavaScript Date object.
   */
  convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }

  /**
   * Resolves the usernames for all messages.
   * @param {Message[]} messages - The messages whose usernames to resolve.
   */
  async resolveUserNames(messages: Message[]) {
    const userIds = [...new Set(messages.map(msg => msg.senderId))];
    for (const userId of userIds) {
      await this.resolveUserName(userId);
    }
  }

  /**
   * Resolves the username for a given user ID.
   * @param {string} userId - The ID of the user.
   */
  async resolveUserName(userId: string) {
    if (!this.userNames[userId]) {
      const userName = await this.userService.getUserNameById(userId);
      this.userNames[userId] = userName;
    }
  }


  /**
   * Gets the username for a given user ID.
   * @param {string} userId - The ID of the user.
   * @returns {string} The username.
   */
  getUserName(userId: string): string {
    return this.userNames[userId] || 'Unknown';
  }


  /**
 * Loads user profiles for the given messages if not already loaded.
 * @param {Message[]} messages - Array of messages to extract user IDs from.
 */
  loadUserProfiles(messages: Message[]) {
    const userIds = [...new Set(messages.map(message => message.senderId))];
    userIds.forEach(userId => {
      if (!this.userProfiles[userId]) {
        this.userService.getUser(userId).subscribe((user: User) => {
          this.userProfiles[userId] = user;
          console.log("user: ", user, " has been loaded");
        });
      }
    });
  }
}
