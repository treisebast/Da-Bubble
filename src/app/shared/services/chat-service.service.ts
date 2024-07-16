import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatUserProfile } from '../models/chat-user-profile.model';
import { Channel } from '../models/channel.model';
import { ChannelMessageService } from './channel-message.service';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private currentChatSource = new BehaviorSubject<ChatUserProfile | Channel | null>(null);
  currentChat$ = this.currentChatSource.asObservable();

  private isChannelSource = new BehaviorSubject<boolean>(true);
  isChannel$ = this.isChannelSource.asObservable();

  private messagesSource = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSource.asObservable();

  constructor(private channelMessageService: ChannelMessageService) {}

  setCurrentChat(chat: ChatUserProfile | Channel) {
    this.currentChatSource.next(chat);
    this.loadMessages(chat);
  }

  private loadMessages(chat: ChatUserProfile | Channel) {
    const channelId = (chat as Channel).id;
    if (channelId) {
      this.channelMessageService.getChannelMessages(channelId).subscribe((messages: Message[]) => {
        this.messagesSource.next(messages);
      });
    } else {
      // Implementiere Logik zum Laden direkter Nachrichten
    }
  }

  addMessage(channelId: string, message: Message) {
    this.channelMessageService.addChannelMessage(channelId, message).then(() => {
      const currentMessages = this.messagesSource.getValue();
      currentMessages.push(message);
      this.messagesSource.next(currentMessages);
    });
  }

  setChannelFalse() {
    this.isChannelSource.next(false);
  }

  setChannelTrue() {
    this.isChannelSource.next(true);
  }

  getChannelStatus() {
    return this.isChannel$;
  }
}
