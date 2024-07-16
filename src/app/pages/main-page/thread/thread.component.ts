import { Component, EventEmitter, inject, Output } from '@angular/core';
import { ChatUserProfile } from '../../../shared/models/chat-user-profile.model';
import { ChatServiceService } from '../../../shared/services/chat-service.service';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {

  currentChat: ChatUserProfile | null = null;
  private chatService = inject(ChatServiceService);

  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      console.log('Current Chat:', chat); // Debugging output
      this.currentChat = chat as ChatUserProfile;
    });
  }

  @Output() closeThread = new EventEmitter<void>();

  onCloseThread() {
    this.closeThread.emit();
  }

  sendMessage() {
    // Logic to send a message
  }

  close() {
    // Logic to close the thread
  }
}
