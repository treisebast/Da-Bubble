import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatUserProfile } from './pages/main-page/chat-channels/chat-channels.component';


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

  private currentChatSource = new BehaviorSubject<ChatUserProfile | null>(null);
  currentChat$ = this.currentChatSource.asObservable();

  private isChannel = new BehaviorSubject<boolean | null>(null);

  private messagesSource = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSource.asObservable();

  setCurrentChat(chat: ChatUserProfile) {
    this.currentChatSource.next(chat);
  }

  setChannelFalse() {
    this.isChannel.next(false);
  }

  setChannelTrue() {
    this.isChannel.next(true);
  }

  getChannelStatus() {
    return this.isChannel.asObservable();
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
}
