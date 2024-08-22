import { Injectable } from '@angular/core';
import {
  Firestore,
  collectionData,
  doc,
  docData,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.model';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  private channelsCollection = collection(this.firestore, 'channels');
  private directMessageCollection = collection(this.firestore, 'directMessages');

  constructor(private firestore: Firestore) {}

  /**
   * Get all channels (public or private)
   * @param isPrivate - boolean indicating if the channels are private
   * @returns Observable<Channel[]>
   */
  getChannels(isPrivate: boolean): Observable<Channel[]> {
    const collectionRef = isPrivate ? this.directMessageCollection : this.channelsCollection;
    const channelsQuery = query(collectionRef, orderBy('createdAt', 'asc'));
    return collectionData(channelsQuery, { idField: 'id' }) as Observable<Channel[]>;
  }

  /**
   * Get a single channel by id (public or private)
   * @param id - string channel id
   * @param isPrivate - boolean indicating if the channel is private
   * @returns Observable<Channel>
   */
  getChannel(id: string, isPrivate: boolean): Observable<Channel> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDoc = doc(this.firestore, `${collectionPath}/${id}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
  }

  /**
   * Add a new channel (public or private)
   * @param channel - Channel object
   * @returns Promise<void>
   */
  async addChannel(channel: Channel): Promise<void> {
    try {
      const collectionRef = channel.isPrivate ? this.directMessageCollection : this.channelsCollection;
      const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
      await this.addChannelToCollection(channel, collectionRef, collectionPath);
    } catch (error) {
      console.error('Error adding channel:', error);
    }
  }

  /**
   * Update an existing channel (public or private)
   * @param channel - Channel object
   * @returns Promise<void>
   */
  updateChannel(channel: Channel): Promise<void> {
    const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
    const channelDoc = doc(this.firestore, `${collectionPath}/${channel.id}`);
    return updateDoc(channelDoc, { ...channel });
  }

  /**
   * Delete a channel by id (public or private)
   * @param id - string channel id
   * @param isPrivate - boolean indicating if the channel is private
   * @returns Promise<void>
   */
  deleteChannel(id: string, isPrivate: boolean): Promise<void> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDoc = doc(this.firestore, `${collectionPath}/${id}`);
    return deleteDoc(channelDoc);
  }

  /**
   * Get all messages for a specific channel (public or private)
   * @param channelId - string channel id
   * @param isPrivate - boolean indicating if the channel is private
   * @returns Observable<Message[]>
   */
  getChannelMessages(channelId: string, isPrivate: boolean): Observable<Message[]> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const messagesCollection = collection(this.firestore, `${collectionPath}/${channelId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<Message[]>;
  }

  /**
   * Private method to add a channel to Firestore
   * @param channel - Channel object
   * @param collectionRef - Firestore collection reference
   * @param collectionPath - string collection path
   * @returns Promise<void>
   */
  private async addChannelToCollection(channel: Channel, collectionRef: any, collectionPath: string): Promise<void> {
    try {
      const docRef = await addDoc(collectionRef, channel);
      await updateDoc(doc(this.firestore, `${collectionPath}/${docRef.id}`), { id: docRef.id });
    } catch (error) {
      console.error(`Error adding channel to ${collectionPath}:`, error);
    }
  }
}
