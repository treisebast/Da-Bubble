import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, from, Observable, switchMap } from 'rxjs';
import { Channel } from '../models/channel.model';
import { ChannelMessageService } from './channel-message.service';
import { Message } from '../models/message.model';
import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { User } from '../models/user.model';
import { FirebaseStorageService } from './firebase-storage.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private currentChatSubject = new BehaviorSubject<Channel | null>(null);
  currentChat$ = this.currentChatSubject.asObservable();

  private selectedChatSubject = new BehaviorSubject<boolean>(false);
  selectedChat$ = this.selectedChatSubject.asObservable();

  private isChannelSource = new BehaviorSubject<boolean>(false);
  isChannel$ = this.isChannelSource.asObservable();

  private messagesSource = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSource.asObservable();

  private loadingStateSubject = new BehaviorSubject<boolean>(false);
  loadingState$ = this.loadingStateSubject.asObservable();

  private createPrivateChatSubject = new BehaviorSubject<User | null>(null);
  createPrivateChat$ = this.createPrivateChatSubject.asObservable();

  constructor(
    private channelMessageService: ChannelMessageService,
    private storageService: FirebaseStorageService
  ) { }

  /**
   * Sets the current chat and loads its messages.
   * @param {Channel} chat - The chat to set as current.
   * @param {boolean} isPrivateOrNot - The chat type.
   */
  setCurrentChat(chat: Channel, isPrivateOrNot: boolean) {
    if (!chat.id) {
      console.error('No chat ID available, chat cannot be set.');
      return;
    }

    this.currentChatSubject.next(chat);

    this.loadMessages(chat, isPrivateOrNot);
  }

  /**
   * Sets the selected chat status.
   * @param {boolean} selected - The new value for the selected chat status.
   */
  setSelectedChat(selected: boolean) {
    this.selectedChatSubject.next(selected);
  }

  /**
   * Starts a private chat with the given user.
   * @param {User} user - The user to start a private chat with.
   */
  startPrivateChat(user: User) {
    this.createPrivateChatSubject.next(user);
  }

  /**
   * Loads messages for the given chat.
   * @param {Channel} chat - The chat whose messages to load.
   * @param {boolean} isPrivateOrNot - The chat type.
   */
  private loadMessages(chat: Channel, isPrivateOrNot: boolean) {
    const channelId = chat.id;
    if (channelId) {
      this.channelMessageService
        .getChannelMessages(channelId, isPrivateOrNot)
        .subscribe({
          next: (messages) => {
            this.messagesSource.next(messages);
            // Notify that loading is complete
            this.setLoadingState(false);
          },
          error: (error) => {
            console.error('Error loading messages:', error);
            // Notify that loading is complete even if there's an error
            this.setLoadingState(false);
          },
        });
    } else {
      // No channel ID, so no messages to load
      this.setLoadingState(false);
    }
  }

  /**
   * Sets the current loading state.
   * This state can be used to show or hide loading indicators in the UI.
   * @param {boolean} isLoading - A boolean indicating whether loading is in progress (true) or not (false).
   */
  setLoadingState(isLoading: boolean) {
    this.loadingStateSubject.next(isLoading);
  }

  /**
   * Retrieves the type of the specified channel.
   * Returns whether the channel is private or not.
   * @param {Channel} channel - The channel object whose type needs to be determined.
   * @returns {boolean} - Returns true if the channel is private, otherwise false.
   */
  getChannelType(channel: Channel): boolean {
    return channel.isPrivate;
  }

  /**
   * Gets messages for the given channel ID.
   * @param {string} channelId - The ID of the channel.
   * @param {boolean} isPrivateOrNot - The chat type.
   * @returns {Observable<Message[]>} An observable of the channel's messages.
   */
  getMessages(channelId: string, isPrivateOrNot: boolean): Observable<Message[]> {
    return this.channelMessageService.getChannelMessages(channelId, isPrivateOrNot);
  }

  /**
   * Adds a message to the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {Message} message - The message to add.
   */
  addMessage(
    channelId: string,
    message: Message,
    isPrivateOrNot: boolean
  ): Promise<void> {
    return this.channelMessageService
      .addChannelMessage(channelId, message, isPrivateOrNot)
      .then(() => {
        const currentMessages = this.messagesSource.getValue();
        currentMessages.push(message);
        currentMessages.sort(
          (a, b) =>
            this.convertToDate(a.timestamp).getTime() -
            this.convertToDate(b.timestamp).getTime()
        );
        this.messagesSource.next([...currentMessages]);
      });
  }

  /**
   * Converts a Firestore timestamp to a JavaScript Date object.
   * @param {Timestamp | FieldValue} timestamp - The Firestore timestamp.
   * @returns {Date} The JavaScript Date object.
   */
  private convertToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
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
   * Gets the current channel status.
   * @returns {Observable<boolean>} An observable of the channel status.
   */
  getChannelStatus(): Observable<boolean> {
    return this.isChannel$;
  }

  /**
   * Edits a message in the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} messageId - The ID of the message.
   * @param {string} newContent - The new content of the message.
   */
  editMessage(
    channelId: string,
    messageId: string,
    newContent: string,
    isPrivateOrNot: boolean
  ) {
    this.channelMessageService
      .editChannelMessage(channelId, messageId, newContent, isPrivateOrNot)
      .then(() => {
        const currentMessages = this.messagesSource.getValue();
        const messageIndex = currentMessages.findIndex(
          (msg) => msg.id === messageId
        );
        if (messageIndex > -1) {
          currentMessages[messageIndex].content = newContent;
          currentMessages[messageIndex].edited = true;
          this.messagesSource.next(currentMessages);
        }
      });
  }

  /**
   * Deletes a message in the given channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} messageId - The ID of the message.
   */
  deleteMessage(channelId: string, messageId: string, isPrivateOrNot: boolean) {
    const messageToDelete = this.findMessageById(messageId);

    if (!messageToDelete) {
      console.error('Message not found');
      return;
    }

    if (
      !messageToDelete.attachments ||
      messageToDelete.attachments.length === 0
    ) {
      // Falls keine Anhänge vorhanden sind, verwende die neue Funktion
      this.deleteMessageWithoutAttachments(
        channelId,
        messageId,
        isPrivateOrNot
      );
    } else {
      // Wenn Anhänge vorhanden sind, lösche zuerst die Anhänge und danach die Nachricht.
      this.handleMessageDeletion(
        channelId,
        messageId,
        messageToDelete.attachments,
        isPrivateOrNot
      );
    }
  }

  /**
   * Finds a message by its ID.
   * @param {string} messageId - The ID of the message.
   * @returns {Message | undefined} - The found message or undefined.
   */
  private findMessageById(messageId: string): Message | undefined {
    return this.messagesSource.getValue().find((msg) => msg.id === messageId);
  }

  /**
   * Handles the deletion of a message and its attachments.
   * @param {string} channelId - The ID of the channel.
   * @param {string} messageId - The ID of the message.
   * @param {string[]} attachments - The list of attachment URLs.
   * @param {boolean} isPrivateOrNot - The chat type.
   */
  private handleMessageDeletion(
    channelId: string,
    messageId: string,
    attachments: string[] = [],
    isPrivateOrNot: boolean
  ) {
    this.deleteAttachments(attachments)
      .pipe(
        switchMap(() =>
          this.deleteMessageFromChannel(channelId, messageId, isPrivateOrNot)
        )
      )
      .subscribe({
        next: () => this.updateMessagesAfterDeletion(messageId),
        error: (error) => console.error('Error deleting message:', error),
      });
  }

  /**
   * Deletes a message from a channel that has no attachments.
   * After the message is successfully deleted, the message list is updated.
   *
   * @param {string} channelId - The ID of the channel from which the message will be deleted.
   * @param {string} messageId - The ID of the message to be deleted.
   * @param {boolean} isPrivateOrNot - Indicates whether the chat is private or not.
   */
  private deleteMessageWithoutAttachments(
    channelId: string,
    messageId: string,
    isPrivateOrNot: boolean
  ): void {
    this.deleteMessageFromChannel(
      channelId,
      messageId,
      isPrivateOrNot
    ).subscribe({
      next: () => this.updateMessagesAfterDeletion(messageId),
      error: (error) => console.error('Error deleting message:', error),
    });
  }

  /**
   * Deletes the attachments of a message.
   * @param {string[]} attachments - The list of attachment URLs.
   * @returns {Observable<void[]>} - An observable that completes when all attachments are deleted.
   */
  private deleteAttachments(attachments: string[]): Observable<void[]> {
    const deleteTasks = attachments.map((url) =>
      this.storageService.deleteFile(this.getFilePathFromUrl(url))
    );
    return forkJoin(deleteTasks);
  }

  /**
   * Deletes a message from the channel.
   * @param {string} channelId - The ID of the channel.
   * @param {string} messageId - The ID of the message.
   * @param {boolean} isPrivateOrNot - The chat type.
   * @returns {Observable<void>} - An observable that completes when the message is deleted.
   */
  private deleteMessageFromChannel(
    channelId: string,
    messageId: string,
    isPrivateOrNot: boolean
  ): Observable<void> {
    return from(
      this.channelMessageService.deleteChannelMessage(
        channelId,
        messageId,
        isPrivateOrNot
      )
    );
  }

  /**
   * Updates the messages list after a message is deleted.
   * @param {string} messageId - The ID of the deleted message.
   */
  private updateMessagesAfterDeletion(messageId: string): void {
    const updatedMessages = this.messagesSource
      .getValue()
      .filter((msg) => msg.id !== messageId);
    this.messagesSource.next(updatedMessages);
    console.log('Message and attachments deleted successfully');
  }

  /**
   * Extracts the file path from a given file URL.
   * The URL is decoded and parsed to retrieve the file path within the storage system.
   * @param {string} fileUrl - The full URL of the file from which to extract the path.
   * @returns {string} - The extracted file path.
   */
  private getFilePathFromUrl(fileUrl: string): string {
    return decodeURIComponent(fileUrl).split('/o/')[1].split('?alt=media')[0];
  }

  updateMessageReactions(message: Message): Promise<void> {
    const isPrivateOrNot = message.chatId.includes('dm');
    const channelId = message.chatId;
    const messageId = message.id!;
    const reactions = message.reactions || {};
    const cleanedReactions: { [emoji: string]: string[] } = {};

    for (const [emoji, users] of Object.entries(reactions)) {
      if (users && Array.isArray(users)) {
        const validUsers = users.filter(user => user !== undefined && user !== null);
        if (validUsers.length > 0) {
          cleanedReactions[emoji] = validUsers;
        }
      }
    }

    return this.channelMessageService.updateChannelMessageReactions(channelId, messageId, cleanedReactions, isPrivateOrNot);
}
}
