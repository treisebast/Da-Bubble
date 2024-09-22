import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  forkJoin,
  from,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { Channel } from '../models/channel.model';
import { ChannelMessageService } from './channel-message.service';
import { Message } from '../models/message.model';
import {
  collection,
  collectionData,
  FieldValue,
  Firestore,
  Timestamp,
} from '@angular/fire/firestore';
import { User } from '../models/user.model';
import { FirebaseStorageService } from './firebase-storage.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private currentChatSubject = new BehaviorSubject<{ chat: Channel | null; isPrivate: boolean }>({ chat: null, isPrivate: false });
  public currentChat$ = this.currentChatSubject.asObservable();

  private selectedChatSubject = new BehaviorSubject<boolean>(false);
  selectedChat$ = this.selectedChatSubject.asObservable();

  private loadingStateSubject = new BehaviorSubject<boolean>(false);
  loadingState$ = this.loadingStateSubject.asObservable();

  private createPrivateChatSubject = new BehaviorSubject<User | null>(null);
  createPrivateChat$ = this.createPrivateChatSubject.asObservable();

  messages$ = this.currentChat$.pipe(
    switchMap(({ chat, isPrivate }) => {
      if (chat && chat.id) {
        return this.channelMessageService.getChannelMessages(
          chat.id,
          isPrivate
        );
      } else {
        return of([]);
      }
    }),
    shareReplay(1)
  );

  private isChannelSource = new BehaviorSubject<boolean>(false);
  isChannel$ = this.isChannelSource.asObservable();

  constructor(
    private channelMessageService: ChannelMessageService,
    private storageService: FirebaseStorageService
  ) {}

  /**
   * Sets the current chat and its privacy status.
   * @param {Channel} chat - The chat to set as current.
   * @param {boolean} isPrivate - Whether the chat is private.
   */
  setCurrentChat(chat: Channel, isPrivate: boolean): void {
    this.currentChatSubject.next({ chat, isPrivate });
  }

  /**
   * Sets the selected chat status.
   * @param {boolean} selected - The new value for the selected chat status.
   */
  setSelectedChat(selected: boolean) {
    this.selectedChatSubject.next(selected);
  }

  /**
   * Gets the current channel status.
   * @returns {Observable<boolean>} An observable of the channel status.
   */
  getChannelStatus(): Observable<boolean> {
    return this.isChannel$;
  }

  /**
   * Sets the channel status to false.
   */
  setChannelFalse() {
    this.isChannelSource.next(false);
  }

  /**
   * Sets the channel status to true.
   */
  setChannelTrue() {
    this.isChannelSource.next(true);
  }

  /**
   * Starts a private chat with the given user.
   * @param {User} user - The user to start a private chat with.
   */
  startPrivateChat(user: User) {
    this.createPrivateChatSubject.next(user);
  }

  /**
   * Sets the current loading state.
   * @param {boolean} isLoading - Whether loading is in progress.
   */
  setLoadingState(isLoading: boolean) {
    this.loadingStateSubject.next(isLoading);
  }

  /**
   * Adds a message to the current channel.
   * @param {Message} message - The message to add.
   */
  addMessage(message: Message): Promise<void> {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (chat && chat.id) {
      return this.channelMessageService.addChannelMessage(
        chat.id,
        message,
        isPrivate
      );
    } else {
      return Promise.reject('No current chat selected');
    }
  }

  /**
   * Edits a message in the current channel.
   * @param {string} messageId - The ID of the message.
   * @param {string} newContent - The new content of the message.
   */
  editMessage(messageId: string, newContent: string): Promise<void> {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (chat && chat.id) {
      return this.channelMessageService.editChannelMessage(
        chat.id,
        messageId,
        newContent,
        isPrivate
      );
    } else {
      return Promise.reject('No current chat selected');
    }
  }

  /**
   * Deletes a message in the current channel.
   * @param {string} messageId - The ID of the message.
   */
  deleteMessage(messageId: string) {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (!chat || !chat.id) {
      console.error('No current chat selected');
      return;
    }

    // First, find the message from the messages$
    this.messages$
      .pipe(
        switchMap((messages) => {
          const messageToDelete = messages.find((msg) => msg.id === messageId);
          if (!messageToDelete) {
            console.error('Message not found');
            return of(null);
          }

          if (
            !messageToDelete.attachments ||
            messageToDelete.attachments.length === 0
          ) {
            // No attachments, delete the message directly
            return from(
              this.channelMessageService.deleteChannelMessage(
                chat.id!,
                messageId,
                isPrivate
              )
            );
          } else {
            // Delete attachments first
            const deleteTasks = messageToDelete.attachments.map((url) =>
              this.storageService.deleteFile(this.getFilePathFromUrl(url))
            );
            return forkJoin(deleteTasks).pipe(
              switchMap(() =>
                from(
                  this.channelMessageService.deleteChannelMessage(
                    chat.id!,
                    messageId,
                    isPrivate
                  )
                )
              )
            );
          }
        })
      )
      .subscribe({
        next: () => {
          console.log('Message and attachments deleted successfully');
        },
        error: (error) => console.error('Error deleting message:', error),
      });
  }

  /**
   * Extracts the file path from a given file URL.
   * @param {string} fileUrl - The full URL of the file.
   * @returns {string} - The extracted file path.
   */
  private getFilePathFromUrl(fileUrl: string): string {
    return decodeURIComponent(fileUrl).split('/o/')[1].split('?alt=media')[0];
  }

  /**
   * Updates reactions for a message.
   * @param {Message} message - The message to update.
   */
  updateMessageReactions(message: Message): Promise<void> {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (!chat || !chat.id) {
      return Promise.reject('No current chat selected');
    }
    const channelId = chat.id;
    const messageId = message.id!;
    const reactions = message.reactions || {};

    // Clean reactions
    const cleanedReactions: { [emoji: string]: string[] } = {};
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users && Array.isArray(users)) {
        const validUsers = users.filter((user) => user);
        if (validUsers.length > 0) {
          cleanedReactions[emoji] = validUsers;
        }
      }
    }

    return this.channelMessageService.updateChannelMessageReactions(
      channelId,
      messageId,
      cleanedReactions,
      isPrivate
    );
  }
}
