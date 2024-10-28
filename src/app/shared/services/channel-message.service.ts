import { Injectable, isDevMode, OnDestroy } from '@angular/core';
import { Firestore, collectionData, addDoc, collection, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { Message } from '../models/message.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class ChannelMessageService implements OnDestroy {
  private messageListeners: Map<string, () => void> = new Map();
  private destroy$ = new Subject<void>();

  constructor(
    private firestore: Firestore,
    private cacheService: CacheService
  ) { }

  ngOnDestroy(): void {
    this.removeAllMessageListeners();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets up a real-time listener for a specific channel's messages.
   * @param channelId - The channel ID.
   * @param isPrivate - Whether the channel is private.
   */
  listenToMessages(channelId: string, isPrivate: boolean): void {
    const key = `channelMessages-${isPrivate}-${channelId}`;
    if (!this.messageListeners.has(key)) {
      const collectionPath = this.getCollectionPath(isPrivate);
      const messagesCollection = collection(this.firestore, `${collectionPath}/${channelId}/messages`);
      const messagesQuery = query(messagesCollection, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages: Message[] = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id,
        } as Message));
        this.cacheService.set(key, messages); // Cache ohne TTL für Echtzeit-Daten
      }, (error) => {
        console.error(`Error listening to messages for channel ${channelId}:`, error);
      });

      this.messageListeners.set(key, unsubscribe);
    }
  }

  /**
   * Removes the real-time listener for a specific channel's messages.
   * @param channelId - The channel ID.
   * @param isPrivate - Whether the channel is private.
   */
  removeMessagesListener(channelId: string, isPrivate: boolean): void {
    const key = `channelMessages-${isPrivate}-${channelId}`;
    const unsubscribe = this.messageListeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.messageListeners.delete(key);
      if (isDevMode()) {
        // console.log(`[ChannelMessageService] Listener removed for key: ${key}`);
      }
    }
  }

  removeAllMessageListeners(): void {
    this.messageListeners.forEach((unsubscribe, key) => {
      unsubscribe();
      this.messageListeners.delete(key);
      if (isDevMode()) {
        // console.log(`[ChannelMessageService] Listener removed for key: ${key}`);
      }
    });
  }

  /**
   * Retrieves all messages from a specific channel with caching.
   * @param channelId - The channel ID.
   * @param isPrivate - Whether the channel is private.
   * @returns Observable of Message array.
   */
  getChannelMessages(
    channelId: string,
    isPrivate: boolean
  ): Observable<Message[]> {
    const collectionPath = this.getCollectionPath(isPrivate);
    const key = `channelMessages-${isPrivate}-${channelId}`;
    return this.cacheService.wrap(key, () => {
      const messagesCollection = collection(
        this.firestore,
        `${collectionPath}/${channelId}/messages`
      );
      const messagesQuery = query(messagesCollection, orderBy('timestamp', 'asc'));
      return collectionData(messagesQuery, { idField: 'id' }) as Observable<Message[]>;
    });
  }


  /**
   * Adds a new message to the specified channel and invalidates the cache.
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
   * Edits an existing message in a channel and invalidates the cache.
   * @param channelId - The channel ID.
   * @param messageId - The message ID.
   * @param updatedContent - The new content.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when the message is edited.
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
      content_lowercase: updatedContent.toLowerCase(),
      edited: true,
    });
  }

  /**
   * Deletes a specific message from a channel and invalidates the cache.
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
   * Updates reactions for a message and invalidates the cache.
   * @param channelId - The channel ID.
   * @param messageId - The message ID.
   * @param reactions - The reactions.
   * @param isPrivate - Whether the channel is private.
   * @returns Promise that resolves when reactions are updated.
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
