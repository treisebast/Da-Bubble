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
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss']
})
export class ThreadComponent implements OnInit {
  currentChat: User | Channel | null = null;
  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  messages: Message[] = [];
  newMessageText = '';
  currentMessageToOpen: any;
  currentUserId = '';
  currentUserName = '';
  userNames: { [key: string]: string } = {};
  userProfiles: { [key: string]: User } = {};
  totalReplies: number = 0;
  editingMessageId: string | null | undefined = null;
  editContent: string = '';


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

  async sendMessage(event?: Event) {
    if (event) {
      event.preventDefault();
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

  async resolveUserNames(messages: Message[]) {
    const userIds = [...new Set(messages.map(msg => msg.senderId))];
    for (const userId of userIds) {
      await this.resolveUserName(userId);
    }
  }

  async resolveUserName(userId: string) {
    if (!this.userNames[userId]) {
      const userName = await this.userService.getUserNameById(userId);
      this.userNames[userId] = userName;
    }
  }

  getUserName(userId: string): string {
    return this.userNames[userId] || 'Unknown';
  }

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

  /**
   * Opens the edit dialog for the selected message.
   * @param {Message} message - The message to edit.
   */
  editMessage(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.startEditing(message);  // Startet den Bearbeitungsmodus direkt
    }
  }

  /**
   * Deletes the selected message if the current user is the sender.
   * @param {Message} message - The message to delete.
   */
  deleteMessage(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.threadService.deleteThread(
        message.chatId!,
        this.threadService.currentMessageId,
        message.id!
      ).then(() => {
        console.log('Message deleted successfully');
      }).catch(error => {
        console.error('Error deleting message:', error);
      });
    } else {
      console.error("You cannot delete another user's message.");
    }
  }
  
  startEditing(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.editingMessageId = message.id;
      this.editContent = message.content;
    }
  }

  saveEdit(message: Message) {
    if (this.editContent.trim() !== '') {
      message.content = this.editContent;
      this.threadService.updateThread(
        message.chatId!,
        this.threadService.currentMessageId,
        message
      ).then(() => {
        console.log('Message updated successfully');
      }).catch(error => {
        console.error('Error updating message:', error);
      });
    }
    this.editingMessageId = null;
  }

  cancelEdit() {
    this.editingMessageId = null;
  }
}
