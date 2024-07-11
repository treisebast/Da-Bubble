import { Component, EventEmitter, inject, Output } from '@angular/core';
import { ChatUserProfile } from '../chat-channels/chat-channels.component';
import { ChatServiceService } from '../chat-service.service';

@Component({
  selector: 'app-chat-secondary',
  standalone: true,
  imports: [],
  templateUrl: './chat-secondary.component.html',
  styleUrl: './chat-secondary.component.scss'
})
export class ChatSecondaryComponent {

  currentChat: ChatUserProfile | null = null;
  private chatService = inject(ChatServiceService);

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
    });
  }

  @Output() closeThread = new EventEmitter<void>();

  onCloseThread() {
    this.closeThread.emit();
  }

  sendMessage() {

  }

  close() {
    
  }
}
