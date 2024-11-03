import { Injectable, isDevMode, OnDestroy } from '@angular/core';
import { Firestore, collectionData, doc, docData, updateDoc, deleteDoc, collection, query, orderBy, DocumentReference, setDoc, where, getDocs, getDoc, onSnapshot } from '@angular/fire/firestore';
import { firstValueFrom, Observable, of, Subject } from 'rxjs';
import { Channel, NewChannel } from '../models/channel.model';
import { CacheService } from './cache.service';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ChannelService implements OnDestroy {
  private channelListeners: Map<string, () => void> = new Map();
  private destroy$ = new Subject<void>();

  constructor(private firestore: Firestore, private cacheService: CacheService) {
    this.listenToChannelUpdates();
  }


  /**
 * Lifecycle hook that is called when the component is destroyed.
 * It performs cleanup by signaling observable completions and unsubscribing from active subscriptions.
 */
  ngOnDestroy(): void {
    this.removeAllChannelListeners();
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Determines the collection path based on channel privacy.
   * @param isChannelPrivate - Whether the channel is private.
   * @returns The collection path as a string.
   */
  private getCollectionPath(isChannelPrivate: boolean): string {
    return isChannelPrivate ? 'directMessages' : 'channels';
  }


  /**
   * Listens to real-time updates for all channels and updates the cache accordingly.
   */
  public listenToChannelUpdates(): void {
    const publicChannelsQuery = query(
      collection(this.firestore, 'channels'),
      where('isPrivate', '==', false),
      orderBy('createdAt', 'asc')
    );

    const unsubscribePublic = onSnapshot(publicChannelsQuery, (snapshot) => {
      const channels: Channel[] = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Channel));
      this.cacheService.set('channels-public', channels);
    }, (error) => {
      console.error('Error listening to public channel updates:', error);
    });

    this.channelListeners.set('channels-public', unsubscribePublic);
    const privateChannelsQuery = query(
      collection(this.firestore, 'directMessages'),
      where('isPrivate', '==', true),
      orderBy('createdAt', 'asc')
    );

    const unsubscribePrivate = onSnapshot(privateChannelsQuery, (snapshot) => {
      const channels: Channel[] = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Channel));
      this.cacheService.set('channels-private', channels);
    }, (error) => {
      console.error('Error listening to private channel updates:', error);
    });

    this.channelListeners.set('channels-private', unsubscribePrivate);
  }


  /**
   * Gets all listeners and unsubscribes.
   */
  removeAllChannelListeners(): void {
    this.channelListeners.forEach((unsubscribe, key) => {
      unsubscribe();
      this.channelListeners.delete(key);
    });
  }


  /**
   * Sets up a real-time listener for a specific channel's messages.
   * @param channelId - The channel ID.
   * @param isPrivate - Whether the channel is private.
   */
  public listenToChannelMessages(channelId: string, isPrivate: boolean): void {
    const key = `channelMessages-${isPrivate}-${channelId}`;
    if (this.channelListeners.has(key)) {
      return;
    }

    const collectionPath = this.getCollectionPath(isPrivate);
    const messagesCollection = collection(
      this.firestore,
      `${collectionPath}/${channelId}/messages`
    );
    const messagesQuery = query(
      messagesCollection,
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages: Message[] = snapshot.docs.map(
          (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          } as Message)
        );
        this.cacheService.set(key, messages);
      },
      (error) => {
        console.error(
          `Error listening to messages for channel ${channelId}:`,
          error
        );
      }
    );
    this.channelListeners.set(key, unsubscribe);
  }


  /**
   * Removes the real-time listener for a specific channel's messages.
   * @param channelId - The channel ID.
   * @param isPrivate - Whether the channel is private.
   */
  public removeChannelMessagesListener(
    channelId: string,
    isPrivate: boolean
  ): void {
    const key = `channelMessages-${isPrivate}-${channelId}`;
    const unsubscribe = this.channelListeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.channelListeners.delete(key);
    }
  }


  /**
   * Retrieves all channels (public or private) with caching.
   * @param isPrivate - Indicates if channels are private.
   * @returns An Observable of Channel array.
   */
  getChannels(isPrivate: boolean): Observable<Channel[]> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const key = `channels-${isPrivate}`;
    return this.cacheService.wrap(key, () => {
      const collectionRef = collection(this.firestore, collectionPath);
      const channelsQuery = query(collectionRef, orderBy('createdAt', 'asc'));
      return collectionData(channelsQuery, { idField: 'id' }) as Observable<
        Channel[]
      >;
    });
  }


  /**
   * Retrieves channels for a specific user with caching.
   * @param userId - The user ID.
   * @param isPrivate - Indicates if channels are private.
   * @returns An Observable of Channel array.
   */
  getChannelsForUser(userId: string, isPrivate: boolean): Observable<Channel[]> {
    if (!userId) {
      return of([]);
    }
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const key = `channels-for-user-${isPrivate}-${userId}`;
    return this.cacheService.wrap(key, () => {
      const collectionRef = collection(this.firestore, collectionPath);
      const channelsQuery = query(
        collectionRef,
        where('members', 'array-contains', userId),
        orderBy('createdAt', 'asc')
      );
      return collectionData(channelsQuery, { idField: 'id' }) as Observable<
        Channel[]
      >;
    });
  }


  /**
   * Retrieves a specific channel by ID with caching.
   * @param id - The channel ID.
   * @param isPrivate - Indicates if the channel is private.
   * @returns An Observable of Channel.
   */
  getChannel(id: string, isPrivate: boolean): Observable<Channel> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const key = `channel-${isPrivate}-${id}`;
    return this.cacheService.wrap(key, () => {
      const channelDoc = doc(this.firestore, `${collectionPath}/${id}`);
      return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
    });
  }


  /**
   * Retrieves a channel by its name with caching.
   * @param name - The name of the channel.
   * @param isPrivate - Indicates if the channel is private.
   * @returns A promise resolving to the Channel or null if not found.
   */
  async getChannelByName(
    name: string,
    isPrivate: boolean
  ): Promise<Channel | null> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const key = `channel-by-name-${isPrivate}-${name}`;
    const cached = this.cacheService.get<Channel | null>(key);
    if (cached) {
      return firstValueFrom(cached);
    }

    const collectionRef = collection(this.firestore, collectionPath);
    const channelsQuery = query(collectionRef, where('name', '==', name));
    const querySnapshot = await getDocs(channelsQuery);

    if (!querySnapshot.empty) {
      const channel = querySnapshot.docs[0].data() as Channel;
      this.cacheService.set(key, channel);
      return channel;
    } else {
      this.cacheService.set(key, null);
      return null;
    }
  }

  /**
   * Gets public channels with caching.
   */
  getPublicChannels(): Observable<Channel[]> {
    const key = 'channels-public';
    return this.cacheService.wrap(key, () => {
      const channelsRef = collection(this.firestore, 'channels');
      const q = query(channelsRef, where('isPrivate', '==', false));
      return collectionData(q, { idField: 'id' }) as Observable<Channel[]>;
    });
  }

  /**
   * Gets private channels with caching.
   */
  getPrivateChannels(): Observable<Channel[]> {
    const key = 'channels-private';
    return this.cacheService.wrap(key, () => {
      const channelsRef = collection(this.firestore, 'channels');
      const q = query(channelsRef, where('isPrivate', '==', true));
      return collectionData(q, { idField: 'id' }) as Observable<Channel[]>;
    });
  }

  /**
   * Adds a new channel and invalidates relevant caches.
   * @param channel - The new channel to add.
   * @returns A promise resolving to the DocumentReference.
   */
  async addChannel(channel: NewChannel): Promise<DocumentReference> {
    const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
    const collectionRef = collection(this.firestore, collectionPath);
    const docRef = doc(collectionRef);
    const channelWithId: Channel = { ...channel, id: docRef.id };
    await setDoc(docRef, channelWithId);
    const keyAllChannels = `channels-${channel.isPrivate}`;
    this.cacheService.clear(keyAllChannels);

    // Invalidate the cache for the channel name
    const keyByName = `channel-by-name-${channel.isPrivate}-${channel.name}`;
    this.cacheService.clear(keyByName);

    return docRef;
  }

  /**
   * Updates an existing channel and invalidates relevant caches.
   * @param channel - The channel to update.
   * @param updatedFields - The fields to update.
   * @returns A promise resolving when the update is complete.
   */
  async updateChannel(
    channel: Channel,
    updatedFields: Partial<Omit<Channel, 'id'>>
  ): Promise<void> {
    const collectionPath = channel.isPrivate ? 'directMessages' : 'channels';
    const channelDocRef = doc(this.firestore, `${collectionPath}/${channel.id}`);

    let oldName: string | undefined;
    if (updatedFields.name && updatedFields.name !== channel.name) {
      oldName = channel.name;
    }

    await updateDoc(channelDocRef, {
      ...updatedFields,
      updatedAt: new Date(),
    });

    const key = `channel-${channel.isPrivate}-${channel.id}`;
    const keyAllChannels = `channels-${channel.isPrivate}`;
    this.cacheService.clear(key);
    this.cacheService.clear(keyAllChannels);

    if (oldName) {
      const oldKey = `channel-by-name-${channel.isPrivate}-${oldName}`;
      this.cacheService.clear(oldKey);
    }

    if (updatedFields.name) {
      const newKey = `channel-by-name-${channel.isPrivate}-${updatedFields.name}`;
      this.cacheService.clear(newKey);
    }
  }

  /**
   * Deletes a channel and invalidates relevant caches.
   * @param id - The channel ID.
   * @param isPrivate - Indicates if the channel is private.
   * @returns A promise resolving when the deletion is complete.
   */
  async deleteChannel(id: string, isPrivate: boolean): Promise<void> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDoc = doc(this.firestore, `${collectionPath}/${id}`);
    await deleteDoc(channelDoc);

    const key = `channel-${isPrivate}-${id}`;
    const keyAllChannels = `channels-${isPrivate}`;
    this.cacheService.clear(key);
    this.cacheService.clear(keyAllChannels);
  }

  /**
   * Removes a user from a specific channel and updates the cache.
   * @param channelId - The channel ID.
   * @param userId - The user ID to remove.
   * @param isPrivate - Indicates if the channel is private.
   * @returns A promise resolving when the user is removed.
   */
  async removeUserFromChannel(
    channelId: string,
    userId: string,
    isPrivate: boolean
  ): Promise<void> {
    const collectionPath = isPrivate ? 'directMessages' : 'channels';
    const channelDocRef = doc(this.firestore, `${collectionPath}/${channelId}`);
    const channelSnapshot = await getDoc(channelDocRef);
    if (channelSnapshot.exists()) {
      const channelData = channelSnapshot.data() as Channel;
      const updatedMembers = channelData.members.filter(
        (memberId) => memberId !== userId
      );
      await updateDoc(channelDocRef, { members: updatedMembers });
    }
  }

  /**
   * Removes all channel listeners.
   */
  public removeAllListeners(): void {
    this.channelListeners.forEach((unsubscribe, key) => {
      unsubscribe();
      this.channelListeners.delete(key);
    });
  }
}
