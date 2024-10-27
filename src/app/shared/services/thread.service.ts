import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, updateDoc, deleteDoc, getDocs, query, orderBy, limit } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { Message } from '../models/message.model';
import { addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { convertToDate } from '../../shared/utils';

@Injectable({
  providedIn: 'root',
})
export class ThreadService {

  /**
 * Subject to hold the current list of threads.
 */
  private currentThreadSubject = new BehaviorSubject<Message[]>([]);

  /**
 * Observable stream of the current threads.
 */
  currentThread$ = this.currentThreadSubject.asObservable();

  /**
  * The ID of the current message being viewed or interacted with.
  */
  currentMessageId: string = '';

  /**
 * Subject to hold the message that is currently set to be opened.
 */
  private currentMessageToOpenSubject = new BehaviorSubject<Message | null>(null);

  /**
 * Observable stream of the message to be opened.
 */
  currentMessageToOpen$ = this.currentMessageToOpenSubject.asObservable();

  constructor(private firestore: Firestore) { }


  /**
 * Retrieves all threads for a specific message within a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @returns An observable array of threads.
 */
  getThreads(channelId: string, messageId: string): Observable<any[]> {
    const threadsCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
    return collectionData(threadsCollection, { idField: 'id' }) as Observable<
      any[]
    >;
  }


  /**
  * Retrieves a specific thread within a message in a channel.
  * @param channelId - The ID of the channel.
  * @param messageId - The ID of the message.
  * @param threadId - The ID of the thread.
  * @returns An observable of the thread.
  */
  getThread(channelId: string, messageId: string, threadId: string): Observable<any> {
    const threadDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads/${threadId}`
    );
    return docData(threadDoc, { idField: 'id' }) as Observable<any>;
  }


  /**
 * Adds a new thread to a specific message within a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param threadMetadata - The metadata of the thread to be added.
 * @returns A promise that resolves when the thread is added successfully.
 */
  async addThread(channelId: string, messageId: string, threadMetadata: Message): Promise<void> {
    try {
      const threadCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
      await addDoc(threadCollection, { ...threadMetadata, timestamp: serverTimestamp() });
      await this.updateThreadCount(channelId, messageId);
      await this.updateLastReplyTimestamp(channelId, messageId, Timestamp.now());
    } catch (error) {
      throw error;
    }
  }


  /**
 * Updates an existing thread within a message in a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param thread - The thread data to be updated.
 * @returns A promise that resolves when the thread is updated successfully.
 */
  updateThread(channelId: string, messageId: string, thread: any): Promise<void> {
    const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${thread.id}`);
    return updateDoc(threadDoc, thread);
  }


  /**
 * Deletes a specific thread within a message in a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param threadId - The ID of the thread to be deleted.
 * @returns A promise that resolves when the thread is deleted successfully.
 */
  async deleteThread(channelId: string, messageId: string, threadId: string): Promise<void> {
    const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${threadId}`);
    await deleteDoc(threadDoc);

    await this.updateThreadCount(channelId, messageId);

    const threadsCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
    const q = query(threadsCollection, orderBy('timestamp', 'desc'), limit(1));
    const threadsSnapshot = await getDocs(q);

    if (!threadsSnapshot.empty) {
      const lastReplyThread = threadsSnapshot.docs[0].data();
      if (lastReplyThread && lastReplyThread['timestamp']) {
        await this.updateLastReplyTimestamp(channelId, messageId, lastReplyThread['timestamp']);
      } else {
        await this.updateLastReplyTimestamp(channelId, messageId, null);
      }
    } else {
      await this.updateLastReplyTimestamp(channelId, messageId, null);
    }
  }


  /**
 * Sets the current list of threads.
 * @param threads - The array of threads to set as current.
 */
  setCurrentThread(thread: any) {
    this.currentThreadSubject.next(thread);
  }


  /**
 * Retrieves the current list of threads as an observable.
 * @returns An observable array of current threads.
 */
  getCurrentThread(): Observable<any> {
    return this.currentThread$;
  }


  /**
 * Sets the message that is currently set to be opened.
 * @param message - The message to set as current.
 */
  setCurrentMessageToOpen(message: Message) {
    this.currentMessageToOpenSubject.next(message);
  }


  /**
 * Retrieves the message that is currently set to be opened as an observable.
 * @returns An observable of the message to be opened.
 */
  getCurrentMessageToOpen(): Observable<Message | null> {
    return this.currentMessageToOpen$;
  }


  /**
 * Updates the thread count for a specific message within a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @returns A promise that resolves when the thread count is updated successfully.
 */
  async updateThreadCount(channelId: string, messageId: string): Promise<void> {
    const threadsCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
    const threadsSnapshot = await getDocs(threadsCollection);
    const threadCount = threadsSnapshot.size;
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    await updateDoc(messageDoc, { threadCount });
  }


  /**
 * Updates the thread count and last reply timestamp for a specific message within a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param threadCount - The new thread count.
 * @param lastReplyTimestamp - The new last reply timestamp.
 * @returns A promise that resolves when the thread information is updated successfully.
 */
  updateThreadInfo(channelId: string, messageId: string, threadCount: number, lastReplyTimestamp: Timestamp | null): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return updateDoc(messageDoc, { threadCount, lastReplyTimestamp });
  }


  /**
 * Updates the last reply timestamp for a specific message within a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param lastReplyTimestamp - The new last reply timestamp.
 * @returns A promise that resolves when the last reply timestamp is updated successfully.
 */
  async updateLastReplyTimestamp(channelId: string, messageId: string, lastReplyTimestamp: Timestamp | null): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    await updateDoc(messageDoc, { lastReplyTimestamp: lastReplyTimestamp ? lastReplyTimestamp : null });
  }


  /**
 * Watches for changes to a specific message within a channel and converts timestamps to Date objects.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @returns An observable of the updated message.
 */
  watchMessageChanges(channelId: string, messageId: string): Observable<Message> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return docData(messageDoc, { idField: 'id' }).pipe(
      map((data: any) => {
        return {
          ...data,
          timestamp: convertToDate(data.timestamp),
          lastReplyTimestamp: data.lastReplyTimestamp ? convertToDate(data.lastReplyTimestamp) : null,
        } as Message;
      })
    );
  }


  /**
 * Updates the reactions for a specific message within a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param reactions - The reactions to update.
 * @returns A promise that resolves when the reactions are updated successfully.
 */
  updateOriginalMessageReactions(channelId: string, messageId: string, reactions: { [emoji: string]: string[] }): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return updateDoc(messageDoc, { reactions });
  }

  /**
 * Updates the reactions for a specific thread within a message in a channel.
 * @param channelId - The ID of the channel.
 * @param messageId - The ID of the message.
 * @param threadId - The ID of the thread.
 * @param reactions - The reactions to update.
 * @returns A promise that resolves when the reactions are updated successfully.
 */
  updateThreadMessageReactions(channelId: string, messageId: string, threadId: string, reactions: { [emoji: string]: string[] }): Promise<void> {
    const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${threadId}`);
    return updateDoc(threadDoc, { reactions });
  }
}
