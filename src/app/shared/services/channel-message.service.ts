import { Injectable } from '@angular/core';
import { Firestore, collectionData, addDoc, collection, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';
import { doc, updateDoc } from '@angular/fire/firestore';
@Injectable({
  providedIn: 'root'
})
export class ChannelMessageService {
  constructor(private firestore: Firestore) {}

  getChannelMessages(channelId: string): Observable<Message[]> {
    const messagesCollection = collection(this.firestore, `channels/${channelId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<Message[]>;
  }

  async addChannelMessage(channelId: string, message: Message): Promise<void> {
    const messagesCollection = collection(this.firestore, `channels/${channelId}/messages`);
    await addDoc(messagesCollection, message);
  }

  async editChannelMessage(channelId: string, messageId: string, updatedContent: string): Promise<void> {
    const messageDocRef = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    await updateDoc(messageDocRef, {
      content: updatedContent,
      edited: true,
      timestamp: new Date()
    });
  }

  async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    const messageDocRef = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    await deleteDoc(messageDocRef);
  }
}
