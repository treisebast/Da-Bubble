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
  DocumentReference,
  setDoc,
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
   * @returns Promise<DocumentReference>
   */
  async addChannel(channel: Channel): Promise<DocumentReference> {
    const collectionRef = channel.isPrivate
      ? collection(this.firestore, 'directMessages')
      : collection(this.firestore, 'channels');

    const docRef = doc(collectionRef);
    channel.id = docRef.id;
    await setDoc(docRef, channel);

    return docRef;
  }

  /**
   * Updates a channel with the specified channelId.
   *
   * @param channelId - The ID of the channel to be updated.
   * @param updatedFields - The updated fields of the channel.
   * @returns A promise that resolves when the channel is successfully updated.
   */
  updateChannel(channel: Channel, updatedFields: Partial<Omit<Channel, 'id'>>): Promise<void> {
    const channelDocRef = doc(this.firestore, `channels/${channel.id}`);

    return updateDoc(channelDocRef, {
      ...updatedFields,
      updatedAt: new Date(),
    });
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
}
