import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable, of, shareReplay, Subject, switchMap } from 'rxjs';
import { Channel } from '../models/channel.model';
import { ChannelMessageService } from './channel-message.service';
import { Message } from '../models/message.model';
import { User } from '../models/user.model';
import { FirebaseStorageService } from './firebase-storage.service';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
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
  private destroy$ = new Subject<void>();

  constructor(
    private channelMessageService: ChannelMessageService,
    private storageService: FirebaseStorageService,
    private cacheService: CacheService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  public get currentChatValue(): { chat: Channel | null; isPrivate: boolean } {
    return this.currentChatSubject.getValue();
  }

  /**
   * Sets the current chat and its privacy status.
   * @param chat - The chat to set as current.
   * @param isPrivate - Whether the chat is private.
   */
  setCurrentChat(chat: Channel | null, isPrivate: boolean): void {
    this.currentChatSubject.next({ chat, isPrivate });
  }


  /**
   * Sets the selected chat status.
   * @param selected - The new value for the selected chat status.
   */
  setSelectedChat(selected: boolean): void {
    this.selectedChatSubject.next(selected);
  }


  /**
   * Gets the current channel status.
   * @returns An observable of the channel status.
   */
  getChannelStatus(): Observable<boolean> {
    return this.isChannel$;
  }


  /**
   * Sets the channel status to false.
   */
  setChannelFalse(): void {
    this.isChannelSource.next(false);
  }


  /**
   * Sets the channel status to true.
   */
  setChannelTrue(): void {
    this.isChannelSource.next(true);
  }


  /**
   * Starts a private chat with the given user.
   * @param user - The user to start a private chat with.
   */
  startPrivateChat(user: User): void {
    this.createPrivateChatSubject.next(user);
  }


  /**
   * Sets the current loading state.
   * @param isLoading - Whether loading is in progress.
   */
  setLoadingState(isLoading: boolean): void {
    this.loadingStateSubject.next(isLoading);
  }


  /**
   * Adds a message to the current channel.
   * @param message - The message to add.
   * @returns A promise resolving when the message is added.
   */
  addMessage(message: Message): Promise<void> {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (chat && chat.id) {
      return this.channelMessageService.addChannelMessage(chat.id, message, isPrivate);
    } else {
      return Promise.reject('No current chat selected');
    }
  }


  /**
   * Edits a message in the current channel.
   * @param messageId - The ID of the message.
   * @param newContent - The new content of the message.
   * @returns A promise resolving when the message is edited.
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
   * @param messageId - The ID of the message.
   * @returns A promise resolving when the message is deleted.
   */
  async deleteMessage(messageId: string): Promise<void> {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (!chat || !chat.id) {
      return;
    }

    try {
      const messages = await firstValueFrom(this.messages$);
      const messageToDelete = messages.find((msg) => msg.id === messageId);

      if (!messageToDelete) {
        return;
      }

      if (!messageToDelete.attachments || messageToDelete.attachments.length === 0) {
        await this.channelMessageService.deleteChannelMessage(chat.id, messageId, isPrivate);
      } else {
        const deleteTasks = messageToDelete.attachments.map((url) =>
          this.storageService.deleteFile(this.getFilePathFromUrl(url))
        );
        await Promise.all(deleteTasks);
        await this.channelMessageService.deleteChannelMessage(chat.id, messageId, isPrivate);
      }
    } catch (error) {
    }
  }


  /**
 * Extracts the file path from a given file URL.
 * @param fileUrl - The full URL of the file.
 * @returns The extracted file path.
 */
  private getFilePathFromUrl(fileUrl: string): string {
    return decodeURIComponent(fileUrl).split('/o/')[1].split('?alt=media')[0];
  }


  /**
   * Updates reactions for a message.
   * @param message - The message to update.
   * @returns A promise resolving when reactions are updated.
   */
  updateMessageReactions(message: Message): Promise<void> {
    const { chat, isPrivate } = this.currentChatSubject.getValue();
    if (!chat || !chat.id) {
      return Promise.reject('No current chat selected');
    }
    const channelId = chat.id;
    const messageId = message.id!;
    const reactions = message.reactions || {};
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
