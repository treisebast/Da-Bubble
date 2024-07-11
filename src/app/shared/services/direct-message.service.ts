// src/app/services/direct-message.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, setDoc, updateDoc, deleteDoc, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DirectMessageService {
  constructor(private firestore: Firestore) {}

  getDirectMessages(chatId: string): Observable<any[]> {
    const messagesCollection = collection(this.firestore, `directMessages/${chatId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<any[]>;
  }

  getDirectMessage(chatId: string, messageId: string): Observable<any> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${messageId}`);
    return docData(messageDoc, { idField: 'id' }) as Observable<any>;
  }

  addDirectMessage(chatId: string, message: any): Promise<void> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${message.id}`);
    return setDoc(messageDoc, message);
  }

  updateDirectMessage(chatId: string, message: any): Promise<void> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${message.id}`);
    return updateDoc(messageDoc, message);
  }

  deleteDirectMessage(chatId: string, messageId: string): Promise<void> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${messageId}`);
    return deleteDoc(messageDoc);
  }
}
