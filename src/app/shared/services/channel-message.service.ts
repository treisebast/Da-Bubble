// src/app/services/channel-message.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChannelMessageService {
  constructor(private firestore: Firestore) {}

  getChannelMessages(channelId: string): Observable<any[]> {
    const messagesCollection = collection(this.firestore, `channels/${channelId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<any[]>;
  }

  getChannelMessage(channelId: string, messageId: string): Observable<any> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return docData(messageDoc, { idField: 'id' }) as Observable<any>;
  }

  addChannelMessage(channelId: string, message: any): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${message.id}`);
    return setDoc(messageDoc, message);
  }

  updateChannelMessage(channelId: string, message: any): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${message.id}`);
    return updateDoc(messageDoc, message);
  }

  deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    const messageDoc = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return deleteDoc(messageDoc);
  }
}
