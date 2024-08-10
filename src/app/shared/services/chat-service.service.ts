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
  private _selectedChat = new BehaviorSubject<boolean>(false);

  private currentChatSource = new BehaviorSubject<User | Channel | null>(null);
  currentChat$ = this.currentChatSource.asObservable();

  private isChannelSource = new BehaviorSubject<boolean>(false);
  isChannel$ = this.isChannelSource.asObservable();

  private messagesSource = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSource.asObservable();

  constructor(private channelMessageService: ChannelMessageService) {}

  /**
   * Sets the current chat and loads its messages.
   * @param {User | Channel} chat - The chat to set as current.
   */
  setCurrentChat(chat: User | Channel) {
    this.currentChatSource.next(chat);
    this.loadMessages(chat);
  }

  /**
   * Loads messages for the given chat.
   * @param {ChatUserProfile | Channel} chat - The chat whose messages to load.
   */
  private loadMessages(chat: User | Channel) {
    const channelId = (chat as Channel).id;
    if (channelId) {
      this.channelMessageService.getChannelMessages(channelId).subscribe((messages: Message[]) => {
        messages.sort((a, b) => this.convertToDate(a.timestamp).getTime() - this.convertToDate(b.timestamp).getTime());
        this.messagesSource.next(messages);
      });
    } else {
      // Implement logic for loading direct messages
    }
  }

  /**
   * Gets messages for the given channel ID.
   * @param {string} channelId - The ID of the channel.
   * @returns {Observable<Message[]>} An observable of the channel's messages.
   */
  getMessages(channelId: string): Observable<Message[]> {
    return this.channelMessageService.getChannelMessages(channelId);
  }

  /**
   * Adds a message to the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {Message} message - The message to add.
   */
  addMessage(channelId: string, message: Message) {
    this.channelMessageService.addChannelMessage(channelId, message).then(() => {
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
   * Gets the selected chat status as an observable.
   * @returns {Observable<boolean>} An observable of the selected chat status.
   */
  get selectedChat$(): Observable<boolean> {
    return this._selectedChat.asObservable();
  }

  /**
   * Sets the selected chat status.
   * @param {boolean} value - The new value for the selected chat status.
   */
  setSelectedChat(value: boolean) {
    this._selectedChat.next(value);
  }
}
