import { Component, EventEmitter, inject, Output, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ChatService } from '../../shared/services/chat-service.service';
import { ThreadService } from '../../shared/services/thread.service';
import { CommonModule } from '@angular/common';
import { collection, doc, FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Message } from '../../shared/models/message.model';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { finalize, firstValueFrom, from, switchMap } from 'rxjs';
import { Firestore } from '@angular/fire/firestore';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { getMetadata, getStorage, ref } from 'firebase/storage';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, MatMenuModule, ImageOverlayComponent],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss']
})
export class ThreadComponent implements OnInit {

  currentUserId = '';
  currentUserName = '';
  newMessageText = '';
  fileName: string = '';
  fileSize: number = 0;
  totalReplies: number = 0;
  editContent: string = '';

  currentChat: User | Channel | null = null;
  currentMessageToOpen: Message | null = null;
  overlayImageUrl: string | null = null;
  editingMessageId: string | null | undefined = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  attachmentUrl: string | null = null;
  errorMessage: string | null = null;

  messages: Message[] = [];
  userNames: { [key: string]: string } = {};
  userProfiles: { [key: string]: User } = {};
  metadataMap: { [url: string]: { name: string, size: number } } = {};

  errorTimeout: ReturnType<typeof setTimeout> | null = null;

  private chatService = inject(ChatService);
  private threadService = inject(ThreadService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  constructor(
    private firestore: Firestore,
    private firebaseStorageService: FirebaseStorageService,
    private cdr: ChangeDetectorRef
  ) { }

  @ViewChild('fileInput') fileInput!: ElementRef;
  @Output() closeThread = new EventEmitter<void>();

  ngOnInit() {
    this.authService.getUser().subscribe(user => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || '';
      }
    });

    this.threadService.getCurrentMessageToOpen().subscribe((chatMessage: Message | null) => {
      this.currentMessageToOpen = chatMessage;
      if (chatMessage) {
        this.resolveUserName(chatMessage.senderId);

        if (this.currentChat && 'id' in this.currentChat && chatMessage.id) {
          const chatId = this.currentChat.id ?? '';
          this.threadService.watchMessageChanges(chatId, chatMessage.id)
            .subscribe(updatedMessage => {
              this.currentMessageToOpen = updatedMessage;
              this.loadUserProfiles([updatedMessage]);
            });
        }

        // Metadaten für die original Nachricht laden
        if (this.currentMessageToOpen?.attachments) {
          this.currentMessageToOpen.attachments.forEach((attachment: string) => {
            if (!this.isImage(attachment)) {
              this.loadFileMetadata(attachment);
            }
          });
        }
      }
    });

    this.chatService.currentChat$.subscribe(chat => {
      this.currentChat = chat as unknown as User;
    });

    this.threadService.currentThread$.subscribe(async currentThread => {
      if (Array.isArray(currentThread)) {
        this.messages = this.sortMessagesByTimestamp(currentThread);
        await this.resolveUserNames(this.messages);
        this.loadUserProfiles(this.messages);
        this.totalReplies = this.messages.length;

        for (const message of this.messages) {
          for (const attachment of message.attachments || []) {
            await this.logAttachmentMetadata(attachment);
          }
        }
      } else {
        this.messages = [];
      }
    });

    // Metadaten für die Thread-Nachrichten laden
    this.messages.forEach((message) => {
      message.attachments?.forEach((attachment) => {
        if (!this.isImage(attachment)) {
          this.loadFileMetadata(attachment);
        }
      });
    });
  }

  onCloseThread() {
    this.closeThread.emit();
  }

  async sendMessage(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    if (this.newMessageText.trim() === '' && !this.selectedFile) {
      return;
    }

    let chatId: string;

    // Überprüfen, ob currentChat existiert und eine ID hat
    if (this.currentChat && 'id' in this.currentChat && this.currentChat.id) {
      chatId = this.currentChat.id;
    } else {
      console.error('Chat ID not found');
      return; // Beende die Funktion, wenn keine gültige Chat-ID gefunden wurde
    }

    if (this.selectedFile) {
      try {
        const autoId = doc(collection(this.firestore, 'dummy')).id;
        const filePath = `thread-files/${chatId}/${autoId}_${this.selectedFile?.name}`;
        const downloadUrl = await firstValueFrom(
          this.firebaseStorageService.uploadFile(this.selectedFile!, filePath)
        );
        this.attachmentUrl = downloadUrl as string;
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    const newMessage: Message = {
      content: this.newMessageText,
      senderId: this.currentUserId,
      timestamp: serverTimestamp(),
      chatId: chatId,
      attachments: this.attachmentUrl ? [this.attachmentUrl] : [],
    };

    // Füge die Nachricht dem Thread hinzu
    this.threadService.addThread(
      chatId,
      this.threadService.currentMessageId,
      newMessage
    );

    // Zurücksetzen der Eingabefelder nach dem Senden
    this.newMessageText = '';
    this.attachmentUrl = null;
    this.selectedFile = null;
    this.previewUrl = null;
  }

  sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      const dateA = this.convertToDate(a.timestamp);
      const dateB = this.convertToDate(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });
  }

  isNewDay(timestamp: Timestamp | FieldValue, index: number): boolean {
    if (index === 0) return true;
    const prevDate = this.convertToDate(this.messages[index - 1].timestamp);
    const currentDate = this.convertToDate(timestamp);
    return prevDate.toDateString() !== currentDate.toDateString();
  }

  convertToDate(timestamp: Timestamp | FieldValue | Date): Date {
    if (timestamp instanceof Timestamp) {
      const date = timestamp.toDate();
      return date;
    } else if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  }

  async resolveUserNames(messages: Message[]) {
    const userIds = [...new Set(messages.map(msg => msg.senderId))];
    for (const userId of userIds) {
      await this.resolveUserName(userId);
    }
  }

  async resolveUserName(userId: string) {
    if (!this.userNames[userId]) {
      const userName = await this.userService.getUserNameById(userId);
      this.userNames[userId] = userName as string;
    }
  }

  getUserName(userId: string): string {
    return this.userNames[userId] || 'Unknown';
  }

  loadUserProfiles(messages: Message[]) {
    const userIds = [...new Set(messages.map(message => message.senderId))];
    userIds.forEach(userId => {
      if (!this.userProfiles[userId]) {
        this.userService.getUser(userId).subscribe((user: User) => {
          this.userProfiles[userId] = user;
          console.log("user: ", user, " has been loaded");
        });
      }
    });
  }

  /**
   * Opens the edit dialog for the selected message.
   * @param {Message} message - The message to edit.
   */
  editMessage(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.startEditing(message);  // Startet den Bearbeitungsmodus direkt
    }
  }

  /**
   * Deletes the selected message if the current user is the sender.
   * @param {Message} message - The message to delete.
   */
  deleteMessage(message: Message) {
    if (this.canDeleteMessage(message)) {
      this.deleteMessageAttachments(message)
        .pipe(
          switchMap(() => this.deleteMessageFromThread(message))
        )
        .subscribe({
          next: () => {
            console.log('Message and attachments deleted successfully');
          },
          error: (error) => {
            console.log('Error deleting message.')
          },
        });
    } else {
      console.error("You cannot delete another user's message.");
    }
  }

  private canDeleteMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  private deleteMessageAttachments(message: Message) {
    const deleteTasks = (message.attachments || []).map((attachmentUrl) => {
      const filePath = this.getFilePathFromUrl(attachmentUrl);
      return this.firebaseStorageService.deleteFile(filePath);
    });

    return from(Promise.all(deleteTasks));
  }

  private deleteMessageFromThread(message: Message) {
    return this.threadService.deleteThread(
      message.chatId!,
      this.threadService.currentMessageId,
      message.id!
    );
  }

  private getFilePathFromUrl(fileUrl: string): string {
    const pathParts = decodeURIComponent(fileUrl).split('/o/')[1].split('?alt=media')[0];
    return pathParts;
  }

  startEditing(message: Message) {
    if (message.senderId === this.currentUserId) {
      this.editingMessageId = message.id;
      this.editContent = message.content;
    }
  }

  saveEdit(message: Message) {
    if (this.editContent.trim() !== '') {
      message.content = this.editContent;
      this.threadService.updateThread(
        message.chatId!,
        this.threadService.currentMessageId,
        message
      ).then(() => {
        console.log('Message updated successfully');
      }).catch(error => {
        console.error('Error updating message:', error);
      });
    }
    this.editingMessageId = null;
  }

  cancelEdit() {
    this.editingMessageId = null;
  }

  isImage(url: string): boolean {
    const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    const isImage = imageTypes.some((type) => url.split('?')[0].toLowerCase().endsWith(type));
    return isImage;
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.manageErrorMessage(null);  // Clear any existing error message

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!this.isValidFile(file)) {
        return;
      }

      this.createFilePreview(file);
    }
  }

  private isValidFile(file: File): boolean {
    const maxSizeInKB = 500;
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];

    if (file.size > maxSizeInKB * 1024) {
      this.manageErrorMessage(`Die Datei überschreitet die maximal erlaubte Größe von ${maxSizeInKB}KB.`);
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.manageErrorMessage('Nur Bilder (PNG, JPEG) und PDFs sind erlaubt.');
      return false;
    }

    return true;
  }

  private createFilePreview(file: File): void {
    if (file.type === 'application/pdf') {
      this.previewUrl = '../../assets/img/chatChannel/pdf.png';
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.attachmentUrl = null;
        this.selectedFile = file;
        this.manageErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
    this.attachmentUrl = null;
    this.selectedFile = file;
    this.manageErrorMessage(null);
  }

  private manageErrorMessage(message: string | null, timeout: number = 4000): void {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
    this.errorMessage = message;
    if (message) {
      this.errorTimeout = setTimeout(() => {
        this.errorMessage = null;
        this.cdr.detectChanges();
      }, timeout);
    }
  }

  removePreview() {
    this.previewUrl = null;
    this.attachmentUrl = null;
    this.fileInput.nativeElement.value = '';
  }

  openOverlay(imageUrl: string) {
    this.overlayImageUrl = imageUrl;
  }

  closeOverlay() {
    this.overlayImageUrl = null;
  }

  loadFileMetadata(attachmentUrl: string): void {
    console.log(`Lade Metadaten für: ${attachmentUrl}`);
    this.firebaseStorageService.getFileMetadata(attachmentUrl)
      .pipe(
        finalize(() => this.cdr.detectChanges())
      )
      .subscribe({
        next: (metadata) => {
          this.metadataMap[attachmentUrl] = {
            name: metadata.name,
            size: metadata.size
          };
          console.log(`Metadaten geladen für: ${attachmentUrl}`, metadata);
        },
        error: (error) => {
          console.error('Fehler beim Abrufen der Metadaten für:', attachmentUrl, error);
        }
      });
  }

  async logAttachmentMetadata(attachmentUrl: string) {
    try {
      const storage = getStorage();
      const filePath = decodeURIComponent(attachmentUrl).split('/o/')[1].split('?alt=media')[0];
      const storageRef = ref(storage, filePath);
      const metadata = await getMetadata(storageRef);

      this.metadataMap[attachmentUrl] = {
        name: metadata.name,
        size: metadata.size,
      };

      console.log('Metadaten geladen:', this.metadataMap[attachmentUrl]);
    } catch (error) {
      console.error('Fehler beim Abrufen der Metadaten:', error);
    }
  }

  isMetadataLoaded(attachment: string): boolean {
    return !!this.metadataMap[attachment];
  }

  logAttachment(attachment: string) {
    console.log('Attachment:', attachment);
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return size + ' B';
    } else {
      return (size / 1024).toFixed(2) + ' KB';
    }
  }
}
