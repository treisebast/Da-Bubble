//TODO:
//BehaviorSubject auf default false setzen wenn es klappt, damit "threads" nicht standardmässig sichtbar ist
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatUserProfile } from '../models/chat-user-profile.model';
import { Channel } from '../models/channel.model';
import { ChannelService } from './channel.service';
import { DirectMessage } from '../models/directMessage.model';

interface Message {
  user: string;
  date: Date;
  time: Date;
  message: string;
  likes: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatServiceService {
  private currentChatSource = new BehaviorSubject<ChatUserProfile | Channel | null>(null);
  currentChat$ = this.currentChatSource.asObservable();

  private isChannelSource = new BehaviorSubject<boolean>(true);//hier auf false setzen wenns läuft
  isChannel$ = this.isChannelSource.asObservable();

  private messagesSource = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSource.asObservable();

  constructor(private channelService: ChannelService) {}

  setCurrentChat(chat: ChatUserProfile | Channel) {
    this.currentChatSource.next(chat);
    this.loadMessages(chat);
  }

  private loadMessages(chat: ChatUserProfile | Channel) {
    if ((chat as Channel).id) {
      this.channelService.getChannelMessages((chat as Channel).id!).subscribe((messages: DirectMessage[]) => {
        const mappedMessages = messages.map(message => ({
          user: message.senderId,
          date: new Date(message.timestamp),
          time: new Date(message.timestamp),
          message: message.content,
          likes: 0
        }));
        this.messagesSource.next(mappedMessages);
      });
    } else {
      // Implement logic to load direct messages
    }
  }

  addMessage(user: string, message: string) {
    const newMessage: Message = {
      user: user,
      date: new Date(),
      time: new Date(),
      message: message,
      likes: 0
    };

    const currentMessages = this.messagesSource.getValue();
    currentMessages.push(newMessage);
    this.messagesSource.next(currentMessages);
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
