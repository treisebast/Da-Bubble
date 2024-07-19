// src/app/services/thread.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Message } from '../models/message.model';
import { addDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class ThreadService {
  private currentThreadSubject = new BehaviorSubject<Message[]>([]);
  currentThread$ = this.currentThreadSubject.asObservable();
  
  currentMessageId:string = '';

  constructor(private firestore: Firestore) {}

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
    return addDoc(threadDoc, thread).then(() => {});
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
}
