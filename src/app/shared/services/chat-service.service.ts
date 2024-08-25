import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel } from '../models/channel.model';
import { ChannelMessageService } from './channel-message.service';
import { Message } from '../models/message.model';
import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private currentChatSubject = new BehaviorSubject<Channel | null>(null);
  currentChat$ = this.currentChatSubject.asObservable();

  private selectedChatSubject = new BehaviorSubject<boolean>(false);
  selectedChat$ = this.selectedChatSubject.asObservable();

  private isChannelSource = new BehaviorSubject<boolean>(false);
  isChannel$ = this.isChannelSource.asObservable();

  private messagesSource = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSource.asObservable();

  private loadingStateSubject = new BehaviorSubject<boolean>(false);
  loadingState$ = this.loadingStateSubject.asObservable();

  constructor(private channelMessageService: ChannelMessageService) {}

  /**
   * Sets the current chat and loads its messages.
   * @param {Channel} chat - The chat to set as current.
   * @param {boolean} isPrivateOrNot - The chat type.
   */
  setCurrentChat(chat: Channel, isPrivateOrNot: boolean) {
    this.currentChatSubject.next(chat);
    this.loadMessages(chat, isPrivateOrNot);
  }


  /**
   * Sets the selected chat status.
   * @param {boolean} selected - The new value for the selected chat status.
   */
  setSelectedChat(selected: boolean) {
    this.selectedChatSubject.next(selected);
  }

  /**
   * Loads messages for the given chat.
   * @param {Channel} chat - The chat whose messages to load.
   * @param {boolean} isPrivateOrNot - The chat type.
   */
  private loadMessages(chat: Channel, isPrivateOrNot: boolean) {
    const channelId = chat.id;
    if (channelId) {
      this.channelMessageService.getChannelMessages(channelId, isPrivateOrNot).subscribe(messages => {
        this.messagesSource.next(messages);
        // Notify that loading is complete
        this.setLoadingState(false);
      }, error => {
        console.error('Error loading messages:', error);
        // Notify that loading is complete even if there's an error
        this.setLoadingState(false);
      });
    } else {
      // No channel ID, so no messages to load
      this.setLoadingState(false);
    }
  }

  private setLoadingState(isLoading: boolean) {
    this.loadingStateSubject.next(isLoading);
  }

  getChannelType(channel: Channel): boolean {
    return channel.isPrivate;
  }

  /**
   * Gets messages for the given channel ID.
   * @param {string} channelId - The ID of the channel.
   * @param {boolean} isPrivateOrNot - The chat type.
   * @returns {Observable<Message[]>} An observable of the channel's messages.
   */
  getMessages(channelId: string, isPrivateOrNot: boolean): Observable<Message[]> {
    return this.channelMessageService.getChannelMessages(channelId, isPrivateOrNot);
  }

  /**
   * Adds a message to the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {Message} message - The message to add.
   */
  addMessage(channelId: string, message: Message, isPrivateOrNot: boolean) {
    this.channelMessageService.addChannelMessage(channelId, message, isPrivateOrNot).then(() => {
      const currentMessages = this.messagesSource.getValue();
      currentMessages.push(message);
      currentMessages.sort((a, b) => this.convertToDate(a.timestamp).getTime() - this.convertToDate(b.timestamp).getTime());
      this.messagesSource.next(currentMessages);
    });
  }

  /**
   * Converts a Firestore timestamp to a JavaScript Date object.
   * @param {Timestamp | FieldValue} timestamp - The Firestore timestamp.
   * @returns {Date} The JavaScript Date object.
   */
  private convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }

  /**
   * Sets the channel status to false.
   */
  setChannelFalse() {
    this.isChannelSource.next(false);
  }

  /**
   * Sets the channel status to true.
   */
  setChannelTrue() {
    this.isChannelSource.next(true);
  }

  /**
   * Gets the current channel status.
   * @returns {Observable<boolean>} An observable of the channel status.
   */
  getChannelStatus(): Observable<boolean> {
    return this.isChannel$;
  }




   /**
   * Edits a message in the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} messageId - The ID of the message.
   * @param {string} newContent - The new content of the message.
   */
   editMessage(channelId: string, messageId: string, newContent: string, isPrivateOrNot: boolean) {
    this.channelMessageService.editChannelMessage(channelId, messageId, newContent, isPrivateOrNot).then(() => {
      const currentMessages = this.messagesSource.getValue();
      const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
      if (messageIndex > -1) {
        currentMessages[messageIndex].content = newContent;
        currentMessages[messageIndex].edited = true;
        this.messagesSource.next(currentMessages);
      }
    });
  }

  /**
   * Deletes a message in the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} messageId - The ID of the message.
   */
  deleteMessage(channelId: string, messageId: string, isPrivateOrNot: boolean) {
    this.channelMessageService.deleteChannelMessage(channelId, messageId, isPrivateOrNot).then(() => {
      const currentMessages = this.messagesSource.getValue();
      const updatedMessages = currentMessages.filter(msg => msg.id !== messageId);
      this.messagesSource.next(updatedMessages);
    });
  }
}
