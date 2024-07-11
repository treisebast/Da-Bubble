import { Component, inject, OnInit } from '@angular/core';
import { ChatChannelsComponent } from '../chat-channels/chat-channels.component';
import { ChatServiceService } from '../chat-service.service';
import { UserProfile } from 'firebase/auth';
import { ChatUserProfile } from '../chat-channels/chat-channels.component';
@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [ChatChannelsComponent],
  templateUrl: './chat-main.component.html',
  styleUrl: './chat-main.component.scss'
})

export class ChatMainComponent implements OnInit {
  currentChat: ChatUserProfile | null = null;
  private chatService = inject(ChatServiceService);

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
    });
  }
}