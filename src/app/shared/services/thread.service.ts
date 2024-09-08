// src/app/services/thread.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { Message } from '../models/message.model';
import { addDoc, Timestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class ThreadService {
  private currentThreadSubject = new BehaviorSubject<Message[]>([]);
  currentThread$ = this.currentThreadSubject.asObservable();

  currentMessageId: string = '';

  private currentMessageToOpenSubject = new BehaviorSubject<Message | null>(null);
  currentMessageToOpen$ = this.currentMessageToOpenSubject.asObservable();

  constructor(private firestore: Firestore) { }

  getThreads(channelId: string, messageId: string): Observable<any[]> {
    const threadsCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
    return collectionData(threadsCollection, { idField: 'id' }) as Observable<any[]>;
  }

  getThread(channelId: string, messageId: string, threadId: string): Observable<any> {
    const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${threadId}`);
    return docData(threadDoc, { idField: 'id' }) as Observable<any>;
  }

  addThread(channelId: string, messageId: string, thread: any): Promise<void> {
    const threadDoc = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
    return addDoc(threadDoc, thread).then(() => {
      this.updateThreadCount(channelId, messageId);
      this.updateLastReplyTimestamp(channelId, messageId, thread.timestamp);
    });
  }

  updateThread(channelId: string, messageId: string, thread: any): Promise<void> {
    const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${thread.id}`);
    return updateDoc(threadDoc, thread);
  }

  deleteThread(channelId: string, messageId: string, threadId: string): Promise<void> {
    const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${threadId}`);
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

  updateThreadCount(channelId: string, messageId: string): void {
    const threadsCollection = collection(this.firestore, `channels/${channelId}/messages/${messageId}/threads`);
    collectionData(threadsCollection).subscribe(threads => {
      const threadCount = threads.length;
      const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
      updateDoc(messageDoc, { threadCount });
    });
  }

  updateThreadInfo(channelId: string, messageId: string, threadCount: number, lastReplyTimestamp: Timestamp | null): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return updateDoc(messageDoc, {
      threadCount,
      lastReplyTimestamp
    });
  }

  updateLastReplyTimestamp(channelId: string, messageId: string, lastReplyTimestamp: Timestamp): void {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    updateDoc(messageDoc, { lastReplyTimestamp });
  }

  watchMessageChanges(channelId: string, messageId: string): Observable<Message> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return docData(messageDoc, { idField: 'id' }).pipe(
      map((data: any) => {
        return {
          ...data,
          timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate() : null,
        } as Message;
      })
    );
  }

updateThreadReactions(channelId: string, messageId: string, threadId: string, reactions: { [emoji: string]: string[] }): Promise<void> {
  const threadDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}/threads/${threadId}`);
  return updateDoc(threadDoc, { reactions });
}
}
