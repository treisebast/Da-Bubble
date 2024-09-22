// channel-message.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collectionData,
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelMessageService {
  constructor(private firestore: Firestore) {}

  /**
   * Retrieves all messages from a specified channel.
   * @param channelId - The channel ID.
   * @param isPrivate - Whether the channel is private.
   * @returns Observable of an array of messages.
   */
  getChannelMessages(
    channelId: string,
    isPrivate: boolean
  ): Observable<Message[]> {
    const collectionPath = this.getCollectionPath(isPrivate);
    const messagesCollection = collection(
      this.firestore,
      `${collectionPath}/${channelId}/messages`
    );
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<
      Message[]
    >;
  }

  /**
   * Adds a new message to the specified channel.
   * @param channelId - The channel ID.
   * @param message - The message to add.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when the message is added.
   */
  async addChannelMessage(
    channelId: string,
    message: Message,
    isPrivate: boolean
  ): Promise<void> {
    const collectionPath = this.getCollectionPath(isPrivate);
    const messagesCollection = collection(
      this.firestore,
      `${collectionPath}/${channelId}/messages`
    );
    await addDoc(messagesCollection, message);
  }

  /**
   * Updates an existing message's content in a channel.
   * @param channelId - The channel ID.
   * @param messageId - The message ID.
   * @param updatedContent - The new content.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when the message is updated.
   */
  async editChannelMessage(
    channelId: string,
    messageId: string,
    updatedContent: string,
    isPrivate: boolean
  ): Promise<void> {
    const collectionPath = this.getCollectionPath(isPrivate);
    const messageDocRef = doc(
      this.firestore,
      `${collectionPath}/${channelId}/messages/${messageId}`
    );
    await updateDoc(messageDocRef, {
      content: updatedContent,
      edited: true,
    });
  }

  /**
   * Deletes a specific message from a channel.
   * @param channelId - The channel ID.
   * @param messageId - The message ID.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when the message is deleted.
   */
  async deleteChannelMessage(
    channelId: string,
    messageId: string,
    isPrivate: boolean
  ): Promise<void> {
    const collectionPath = this.getCollectionPath(isPrivate);
    const messageDocRef = doc(
      this.firestore,
      `${collectionPath}/${channelId}/messages/${messageId}`
    );
    await deleteDoc(messageDocRef);
  }

  /**
   * Updates the reactions of a specific message.
   * @param channelId - The channel ID.
   * @param messageId - The message ID.
   * @param reactions - An object mapping emojis to user IDs.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when the reactions are updated.
   */
  async updateChannelMessageReactions(
    channelId: string,
    messageId: string,
    reactions: { [emoji: string]: string[] },
    isPrivate: boolean
  ): Promise<void> {
    const collectionPath = this.getCollectionPath(isPrivate);
    const messageDocRef = doc(
      this.firestore,
      `${collectionPath}/${channelId}/messages/${messageId}`
    );

    if (reactions && Object.keys(reactions).length > 0) {
      await updateDoc(messageDocRef, { reactions: reactions });
    } else {
      await updateDoc(messageDocRef, { reactions: {} });
    }
  }

  /**
   * Determines the collection path based on channel privacy.
   * @param isChannelPrivate - Whether the channel is private.
   * @returns The collection path as a string.
   */
  private getCollectionPath(isChannelPrivate: boolean): string {
    return isChannelPrivate ? 'directMessages' : 'channels';
  }
}
