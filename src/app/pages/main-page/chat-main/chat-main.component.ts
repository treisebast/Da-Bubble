import { AfterViewChecked, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { ChatChannelsComponent } from '../chat-channels/chat-channels.component';
import { ChatServiceService } from '../../../chat-service.service';
import { ChatUserProfile } from '../chat-channels/chat-channels.component';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

interface Message {
  user: string;
  date: Date;
  time: Date;
  message: string;
  likes: number;
}
@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [ChatChannelsComponent, CommonModule, MatIconModule, FormsModule],
  templateUrl: './chat-main.component.html',
  styleUrl: './chat-main.component.scss'
})

export class ChatMainComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  currentChat: ChatUserProfile | null = null;
  channel: boolean | null = true;
  private chatService = inject(ChatServiceService);
  messages = [
    {
      user: 'Tobias Wall',
      date: new Date(),
      time: new Date(),
      message: 'Hallo, wie geht es dir?',
      likes: 0
    },
    {
      user: 'Marco Amman',
      date: new Date(),
      time: new Date(),
      message: 'Hallo! Mir geht es gut, danke!',
      likes: 0
    }
  ];

  newMessageText = '';



  isNewDay(date: Date, index: number): boolean {
    if (index === 0) return true;
    const prevDate = new Date(this.messages[index - 1].date);
    const currentDate = new Date(date);
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  addMessage(text: string) {
    if (this.currentChat) {
      this.chatService.addMessage(this.currentChat.name, text);
    }
  }


  ngOnInit() {
    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
    });
    this.chatService.messages$.subscribe(messages => {
      //this.messages = messages.sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    this.chatService.getChannelStatus().subscribe(status => {
      if (status === null) this.channel = true;
      else this.channel = status;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll to bottom failed:', err);
    }
  }

  sendMessage() {
    if (this.newMessageText.trim() === '') {
      return;
    }

    const newMessage: Message = {
      user: 'Tobias Wall',
      date: new Date(),
      time: new Date(),
      message: this.newMessageText,
      likes: 0
    };

    this.messages.push(newMessage);
    this.newMessageText = '';


    console.log(this.messages)


  }

}