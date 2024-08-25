import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../shared/models/channel.model';
import { Message } from '../../shared/models/message.model';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { AuthService } from '../../shared/services/auth.service';
import { Timestamp, FieldValue, serverTimestamp } from '@angular/fire/firestore';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MessageComponent } from '../message/message.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import localeDe from '@angular/common/locales/de';
import { ChannelInfoPopupComponent } from '../channel-info-popup/channel-info-popup.component';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { Firestore, collection, doc } from '@angular/fire/firestore';  // Korrekte Importe
import { SharedChannelService } from '../../shared/services/shared-channel.service';

@Component({
  selector: 'app-chat-main',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MessageComponent, MatProgressSpinnerModule, ChannelInfoPopupComponent],
  templateUrl: './chat-main.component.html',
  styleUrls: ['./chat-main.component.scss']
})
export class ChatMainComponent implements OnInit, AfterViewChecked {
  currentChat: any = null;
  isCurrentChatPrivate: boolean = false;
  messages: Message[] = [];
  currentThreadData: any;
  selectedChat: boolean = false;
  hoverStates: { [key: string]: boolean } = {};
  newMessageText = '';
  currentUserId = '';
  currentUserName = '';
  userProfiles: { [key: string]: any } = {};
  isLoading: boolean = false;
  selectedChannel: Channel | null = null;
  previewUrl: string | null = null;
  attachmentUrl: string | null = null;
  selectedFile: File | null = null;
  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  puplicChannels: Channel[] = [];
  filteredChannels: Channel[] = [];
  filteredPuplicChannels: Channel[] = [];

  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private threadService: ThreadService,
    private firebaseStorageService: FirebaseStorageService,
    private firestore: Firestore,
    private sharedChannelService: SharedChannelService
  ) {
    registerLocaleData(localeDe);
  }

  isNewDay(timestamp: Timestamp | FieldValue, index: number): boolean {
    if (index === 0) return true;
    const prevDate = this.convertToDate(this.messages[index - 1].timestamp);
    const currentDate = this.convertToDate(timestamp);
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }
  

  ngOnInit() {
    this.isLoading = true;
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || '';
      }
    });

    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat;
      console.log('currentChat:', this.currentChat);
      if (this.currentChat) {
        const isPrivateOrNot = this.currentChat.isPrivate;
        this.loadMessages(isPrivateOrNot);
      } else {
        console.error('no chat selected');
      }
    });

    this.chatService.selectedChat$.subscribe(chat => {
      this.selectedChat = chat;
    });

    this.chatService.loadingState$.subscribe(isLoading => {
      this.isLoading = isLoading;
    });

    this.isLoading = false;
    this.loadChannelsForSearch();
  }

  loadChannelsForSearch() {
    this.sharedChannelService.privateChannels$.subscribe(channels => {
      this.privateChannels = channels;
    });

    this.sharedChannelService.puplicChannels$.subscribe(channels => {
      this.puplicChannels = channels;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll to bottom failed:', err);
    }
  }

  async loadMessages(isPrivateOrNot: boolean) {
    console.log("loadMessages starts...is Private: ", isPrivateOrNot, " ...currentChat= ", this.currentChat);
    this.isLoading = true;
    this.isCurrentChatPrivate = isPrivateOrNot;
    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      await this.chatService.getMessages(this.currentChat.id, isPrivateOrNot).subscribe((messages: Message[]) => {
        this.messages = messages.sort((a, b) => this.convertToDate(a.timestamp).getTime() - this.convertToDate(b.timestamp).getTime());
        this.loadUserProfiles();
        if (this.messages && this.userProfiles) {
          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 100);
        }
      }, error => {
        console.error('Error loading messages:', error);
        this.isLoading = false;
      });
    } else {
      this.isLoading = false;
    }
  }

  loadUserProfiles() {
    const userIds = [...new Set(this.messages.map(message => message.senderId))];
    userIds.forEach(userId => {
      this.userService.getUser(userId).subscribe((user: User) => {
        this.userProfiles[userId] = {
          name: user.name,
          avatar: user.avatar,
          status: user.status === 'online'
        };
      });
    });
  }

  sendMessage(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    // Wenn die Nachricht leer ist und keine Datei ausgewählt wurde, breche ab
    if (this.newMessageText.trim() === '' && !this.selectedFile) {
      return;
    }

    if (this.selectedFile) {
      const autoId = doc(collection(this.firestore, 'dummy')).id;
      const filePath = `chat-files/${this.currentChat.id}/${autoId}_${this.selectedFile.name}`;

      // Datei hochladen und Nachricht senden
      this.firebaseStorageService.uploadFile(this.selectedFile, filePath).subscribe((downloadUrl) => {
        this.attachmentUrl = downloadUrl;

        // Jetzt die Nachricht senden
        this.createAndSendMessage();
      });
    } else {
      // Keine Datei, einfach die Nachricht senden
      this.createAndSendMessage();
    }
  }

  createAndSendMessage() {
    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat.id,
    };

    // Anhänge nur hinzufügen, wenn attachmentUrl existiert
    if (this.attachmentUrl) {
      newMessage.attachments = [this.attachmentUrl];
    }

    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      this.chatService.addMessage(this.currentChat.id, newMessage, this.isCurrentChatPrivate);
    }

    // Nach dem Senden die Felder zurücksetzen
    this.newMessageText = '';
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.previewUrl = null;
}

  isChatUserProfile(chat: User | Channel): chat is User {
    return (chat as User).avatar !== undefined;
  }

  async openThread(message: Message) {
    this.chatService.setChannelTrue();
    if (!message || !message.id) {
      console.error('Invalid message object:', message);
      return;
    }
    this.threadService.getThreads(this.currentChat.id, message.id)
      .subscribe(currentThread => {
        this.currentThreadData = currentThread;
        this.threadService.setCurrentThread(currentThread);
        if (message.id) {
          this.threadService.currentMessageId = message.id;
          this.threadService.setCurrentMessageToOpen(message);
        }
      });
  }

  onMouseEnter(propertyName: string) {
    this.hoverStates[propertyName] = true;
  }

  onMouseLeave(propertyName: string) {
    this.hoverStates[propertyName] = false;
  }

  getUserName(senderId: string): string {
    return this.userProfiles[senderId]?.name || 'Unknown User';
  }

  openChannelInfoPopup() {
    this.selectedChannel = this.currentChat as Channel;
  }

  closeChannelInfoPopup() {
    this.selectedChannel = null;
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }


handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];

    // Überprüfe die Dateigröße und den Typ
    if (file.size > 500 * 1024) {
      alert('Die Datei überschreitet die maximal erlaubte Größe von 500KB.');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Nur Bilder (PNG, JPEG) und PDFs sind erlaubt.');
      return;
    }

    // Vorschau erstellen
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;

      // Setze die Datei, aber lade sie noch nicht hoch
      this.attachmentUrl = null; // Wir setzen die URL zurück, falls vorher eine Datei hochgeladen wurde
      this.selectedFile = file; // Hier speichern wir die Datei für später
    };
    reader.readAsDataURL(file);
  }
}




  addAttachmentToMessage(downloadUrl: string) {
    // Speichere die URL in der neuen Nachricht
    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: this.currentChat.id,
      attachments: [downloadUrl]  // Anhänge hinzufügen
    };

    // Nachricht senden
    this.chatService.addMessage(this.currentChat.id, newMessage, this.isCurrentChatPrivate);
    this.newMessageText = '';
  }

  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null; // Entferne den einzigen Anhang
    this.fileInput.nativeElement.value = ''; // Resettet den Datei-Input
  }

  /**
   * Handles the keyup event and filters the channels.
   * @param event - Keyboard event from the input field
   */
  onKeyUp(event: KeyboardEvent): void {
    const input = (event.target as HTMLInputElement).value;

    // Check if input contains an '@' followed by any letter
    const matchPrivat = input.match(/@([a-zA-Z0-9]+)/);
    const matchPuplic = input.match(/#([a-zA-Z0-9]+)/);

    if (matchPrivat) {
      const letter = matchPrivat[1].toLowerCase();

      // Filter channels by checking if 'name' is defined and includes the letter
      this.filteredChannels = this.privateChannels.filter(channel =>
        channel.name && channel.name.toLowerCase().includes(letter)
      );
    } else {
      this.filteredChannels = [];
    }

    if (matchPuplic) {
      const letter = matchPuplic[1].toLowerCase();

      // Filter channels by checking if 'name' is defined and includes the letter
      this.filteredPuplicChannels = this.puplicChannels.filter(channel =>
        channel.name && channel.name.toLowerCase().includes(letter)
      );
    } else {
      this.filteredPuplicChannels = [];
    }
  }


}
