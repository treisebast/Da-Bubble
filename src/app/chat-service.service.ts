import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserProfile } from 'firebase/auth';
import { ChatUserProfile } from './chat-channels/chat-channels.component';


@Injectable({
  providedIn: 'root',
})

export class ChatServiceService {

  private currentChatSource = new BehaviorSubject<ChatUserProfile | null>(null);
  currentChat$ = this.currentChatSource.asObservable();

  setCurrentChat(chat: ChatUserProfile) {
    this.currentChatSource.next(chat);
  }
}
