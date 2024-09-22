// channel.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collectionData,
  doc,
  docData,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  DocumentReference,
  setDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  constructor(private firestore: Firestore) {}

  /**
   * Retrieves all channels (public or private).
   * @param isPrivate - Whether the channels are private.
   * @returns Observable of an array of channels.
   */
  getChannels(isPrivate: boolean): Observable<Channel[]> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const collectionRef = collection(this.firestore, collectionPath);
    const channelsQuery = query(collectionRef, orderBy('createdAt', 'asc'));
    return collectionData(channelsQuery, { idField: 'id' }) as Observable<
      Channel[]
    >;
  }

  /**
   * Retrieves a single channel by ID (public or private).
   * @param id - The channel ID.
   * @param isPrivate - Whether the channel is private.
   * @returns Observable of the channel.
   */
  getChannel(id: string, isPrivate: boolean): Observable<Channel> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDoc = doc(this.firestore, `${collectionPath}/${id}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
  }

  /**
   * Adds a new channel (public or private).
   * @param channel - The channel object.
   * @returns Promise that resolves to the document reference.
   */
  async addChannel(channel: Channel): Promise<DocumentReference> {
    const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
    const collectionRef = collection(this.firestore, collectionPath);
    const docRef = doc(collectionRef);
    channel.id = docRef.id;
    await setDoc(docRef, channel);
    return docRef;
  }

  /**
   * Updates an existing channel.
   * @param channel - The channel object.
   * @param updatedFields - The fields to update.
   * @returns Promise that resolves when the channel is updated.
   */
  updateChannel(
    channel: Channel,
    updatedFields: Partial<Omit<Channel, 'id'>>
  ): Promise<void> {
    const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
    const channelDocRef = doc(this.firestore, `${collectionPath}/${channel.id}`);
    return updateDoc(channelDocRef, {
      ...updatedFields,
      updatedAt: new Date(),
    });
  }

  /**
   * Deletes a channel by ID (public or private).
   * @param id - The channel ID.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when the channel is deleted.
   */
  deleteChannel(id: string, isPrivate: boolean): Promise<void> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDoc = doc(this.firestore, `${collectionPath}/${id}`);
    return deleteDoc(channelDoc);
  }
}
