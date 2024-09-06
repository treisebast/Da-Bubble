import { Injectable } from '@angular/core';
import { Firestore, collectionData, addDoc, collection, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';
import { doc, updateDoc } from '@angular/fire/firestore';
@Injectable({
  providedIn: 'root'
})

export class ChannelMessageService {
  collectionPath: string = '';

  constructor(private firestore: Firestore) { }


  /**
 * Fetches all messages from a specified channel in Firestore.
 * The collection path is determined based on whether the channel is private or public.
 * @param channelId The ID of the channel to fetch messages from.
 * @param isPrivate Determines whether the channel is private or public.
 * @returns An observable that emits an array of messages from the channel.
 */
  getChannelMessages(channelId: string, isPrivate: boolean): Observable<Message[]> {
    this.getCollectionPath(isPrivate);
    const messagesCollection = collection(this.firestore, `${this.collectionPath}/${channelId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<Message[]>;

  }


  /**
 * Adds a new message to the specified channel in Firestore.
 * The collection path is determined based on whether the channel is private or public.
 * @param channelId The ID of the channel to which the message should be added.
 * @param message The message object to be added to the channel.
 * @param isPrivate Determines whether the channel is private or public.
 * @returns A promise that resolves when the message has been added.
 */
  async addChannelMessage(channelId: string, message: Message, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messagesCollection = collection(this.firestore, `${this.collectionPath}/${channelId}/messages`);
    await addDoc(messagesCollection, message);
  }


  /**
 * Updates the content of an existing message in a specified channel in Firestore.
 * The collection path is determined based on whether the channel is private or public.
 * @param channelId The ID of the channel containing the message.
 * @param messageId The ID of the message to update.
 * @param updatedContent The new content for the message.
 * @param isPrivate Determines whether the channel is private or public.
 * @returns A promise that resolves when the message has been updated.
 */
  async editChannelMessage(channelId: string, messageId: string, updatedContent: string, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messageDocRef = doc(this.firestore, `${this.collectionPath}/${channelId}/messages/${messageId}`);
    await updateDoc(messageDocRef, {
      content: updatedContent,
      edited: true,
    });
  }


  /**
   * Deletes a specific message from a channel in Firestore.
   * The collection path is determined based on whether the channel is private or public.
   * @param channelId The ID of the channel from which the message should be deleted.
   * @param messageId The ID of the message to delete.
   * @param isPrivate Determines whether the channel is private or public.
   * @returns A promise that resolves when the message has been deleted.
   */
  async deleteChannelMessage(channelId: string, messageId: string, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messageDocRef = doc(this.firestore, `${this.collectionPath}/${channelId}/messages/${messageId}`);
    await deleteDoc(messageDocRef);
  }


  /**
 * Determines and sets the collection path based on whether the channel is private or public.
 * @param isChannelPrivate Boolean value indicating whether the channel is private or public.
 * @returns The collection path as a string, either 'directMessages' for private channels or 'channels' for public ones.
 */
  private getCollectionPath(isChannelPrivate: boolean): string {
    this.collectionPath = isChannelPrivate ? 'directMessages' : 'channels';
    return this.collectionPath;
  }


  /**
 * Updates the reactions of a specific message in a channel in Firestore.
 * The collection path is determined based on whether the channel is private or public.
 * If no reactions are present, an empty object will be set.
 * @param channelId The ID of the channel containing the message.
 * @param messageId The ID of the message to update.
 * @param reactions An object containing emoji reactions and the user IDs associated with them.
 * @param isPrivate Determines whether the channel is private or public.
 * @returns A promise that resolves when the reactions have been updated.
 */
  async updateChannelMessageReactions(channelId: string, messageId: string, reactions: { [emoji: string]: string[] }, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messageDocRef = doc(this.firestore, `${this.collectionPath}/${channelId}/messages/${messageId}`);

    if (reactions && Object.keys(reactions).length > 0) {
      await updateDoc(messageDocRef, { reactions: reactions });
    } else {
      await updateDoc(messageDocRef, { reactions: {} });
    }
  }
}
