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
  where,
  getDocs,
  getDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel, NewChannel } from '../models/channel.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  constructor(private firestore: Firestore) { }

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

  getChannelsForUser(userId: string, isPrivate: boolean): Observable<Channel[]> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const collectionRef = collection(this.firestore, collectionPath);
    const channelsQuery = query(
      collectionRef,
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'asc')
    );
    return collectionData(channelsQuery, { idField: 'id' }) as Observable<Channel[]>;
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
  async addChannel(channel: NewChannel): Promise<DocumentReference> {
    const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
    const collectionRef = collection(this.firestore, collectionPath);
    const docRef = doc(collectionRef);

    // Setzen Sie die 'id' auf die generierte Dokument-ID
    const channelWithId: Channel = { ...channel, id: docRef.id };
    await setDoc(docRef, channelWithId);
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
    }).catch((error) => {
      console.error('Fehler beim Aktualisieren des Channels:', error);
      throw error;
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

  async removeUserFromChannel(channelId: string, userId: string, isPrivate: boolean): Promise<void> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDocRef = doc(this.firestore, `${collectionPath}/${channelId}`);
    const channelSnapshot = await getDoc(channelDocRef);
    if (channelSnapshot.exists()) {
      const channelData = channelSnapshot.data() as Channel;
      const updatedMembers = channelData.members.filter(memberId => memberId !== userId);
      await updateDoc(channelDocRef, { members: updatedMembers });
    }
  }


  async getChannelByName(name: string, isPrivate: boolean): Promise<Channel | null> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const collectionRef = collection(this.firestore, collectionPath);
    const channelsQuery = query(collectionRef, where('name', '==', name));
    const querySnapshot = await getDocs(channelsQuery);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Channel;
    } else {
      return null;
    }
  }

  getPublicChannels(): Observable<Channel[]> {
    const channelsRef = collection(this.firestore, 'channels');
    const q = query(channelsRef, where('isPrivate', '==', false));
    return collectionData(q, { idField: 'id' }) as Observable<Channel[]>;
  }

  getPrivateChannels(): Observable<Channel[]> {
    const channelsRef = collection(this.firestore, 'channels');
    const q = query(channelsRef, where('isPrivate', '==', true));
    return collectionData(q, { idField: 'id' }) as Observable<Channel[]>;
  }
}
