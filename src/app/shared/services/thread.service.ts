// src/app/services/thread.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { Message } from '../models/message.model';
import { addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class ThreadService {
  private currentThreadSubject = new BehaviorSubject<Message[]>([]);
  currentThread$ = this.currentThreadSubject.asObservable();

  currentMessageId: string = '';

  private currentMessageToOpenSubject = new BehaviorSubject<Message | null>(
    null
  );
  currentMessageToOpen$ = this.currentMessageToOpenSubject.asObservable();

  constructor(private firestore: Firestore) {}

  getThreads(channelId: string, messageId: string): Observable<any[]> {
    const threadsCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads`
    );
    return collectionData(threadsCollection, { idField: 'id' }) as Observable<
      any[]
    >;
  }

  getThread(
    channelId: string,
    messageId: string,
    threadId: string
  ): Observable<any> {
    const threadDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads/${threadId}`
    );
    return docData(threadDoc, { idField: 'id' }) as Observable<any>;
  }

  async addThread(
    channelId: string,
    messageId: string,
    threadMetadata: Message
  ): Promise<void> {
    try {
      const threadCollection = collection(
        this.firestore,
        `channels/${channelId}/messages/${messageId}/threads`
      );
      await addDoc(threadCollection, {
        ...threadMetadata,
        timestamp: serverTimestamp(),
      });
      await this.updateThreadCount(channelId, messageId);
      await this.updateLastReplyTimestamp(
        channelId,
        messageId,
        Timestamp.now()
      );
    } catch (error) {
      console.error('Error adding thread:', error);
      throw error;
    }
  }

  updateThread(
    channelId: string,
    messageId: string,
    thread: any
  ): Promise<void> {
    const threadDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads/${thread.id}`
    );
    return updateDoc(threadDoc, thread);
  }

  deleteThread(
    channelId: string,
    messageId: string,
    threadId: string
  ): Promise<void> {
    const threadDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads/${threadId}`
    );
    return deleteDoc(threadDoc);
  }

  setCurrentThread(thread: any) {
    this.currentThreadSubject.next(thread);
  }

  getCurrentThread(): Observable<any> {
    return this.currentThread$;
  }

  setCurrentMessageToOpen(message: Message) {
    this.currentMessageToOpenSubject.next(message);
  }

  getCurrentMessageToOpen(): Observable<Message | null> {
    return this.currentMessageToOpen$;
  }

  async updateThreadCount(channelId: string, messageId: string): Promise<void> {
    const threadsCollection = collection(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads`
    );
    const threadsSnapshot = await getDocs(threadsCollection);
    const threadCount = threadsSnapshot.size;
    const messageDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}`
    );
    await updateDoc(messageDoc, { threadCount });
  }

  updateThreadInfo(
    channelId: string,
    messageId: string,
    threadCount: number,
    lastReplyTimestamp: Timestamp | null
  ): Promise<void> {
    const messageDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}`
    );
    return updateDoc(messageDoc, {
      threadCount,
      lastReplyTimestamp,
    });
  }

  async updateLastReplyTimestamp(
    channelId: string,
    messageId: string,
    lastReplyTimestamp: Timestamp
  ): Promise<void> {
    const messageDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}`
    );
    await updateDoc(messageDoc, { lastReplyTimestamp });
  }

  watchMessageChanges(
    channelId: string,
    messageId: string
  ): Observable<Message> {
    const messageDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}`
    );
    return docData(messageDoc, { idField: 'id' }).pipe(
      map((data: any) => {
        return {
          ...data,
          timestamp: data.timestamp
            ? (data.timestamp as Timestamp).toDate()
            : null,
        } as Message;
      })
    );
  }

  updateOriginalMessageReactions(
    channelId: string,
    messageId: string,
    reactions: { [emoji: string]: string[] }
  ): Promise<void> {
    const messageDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}`
    );
    return updateDoc(messageDoc, { reactions });
  }

  updateThreadMessageReactions(
    channelId: string,
    messageId: string,
    threadId: string,
    reactions: { [emoji: string]: string[] }
  ): Promise<void> {
    const threadDoc = doc(
      this.firestore,
      `channels/${channelId}/messages/${messageId}/threads/${threadId}`
    );
    return updateDoc(threadDoc, { reactions });
  }
}
