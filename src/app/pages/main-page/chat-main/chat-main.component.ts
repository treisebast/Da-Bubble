import { Component, inject, OnInit } from '@angular/core';
import { ChatChannelsComponent } from '../chat-channels/chat-channels.component';
import { ChatServiceService } from '../../../chat-service.service';
import { ChatUserProfile } from '../chat-channels/chat-channels.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [ChatChannelsComponent, CommonModule],
  templateUrl: './chat-main.component.html',
  styleUrl: './chat-main.component.scss'
})

export class ChatMainComponent implements OnInit {
  currentChat: ChatUserProfile | null = null;
  channel: boolean | null = true;
  private chatService = inject(ChatServiceService);

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
    });

    this.chatService.getChannelStatus().subscribe(status => {
      if (status === null) this.channel = true;
      else this.channel = status;
    });
  }

  sendMessage() {
    this.channel = !this.channel;
  }
}