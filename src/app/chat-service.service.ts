import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatUserProfile } from './pages/main-page/chat-channels/chat-channels.component';


@Injectable({
  providedIn: 'root',
})

export class ChatServiceService {

  private currentChatSource = new BehaviorSubject<ChatUserProfile | null>(null);
  currentChat$ = this.currentChatSource.asObservable();

  private isChannel = new BehaviorSubject<boolean | null>(null);

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
}
