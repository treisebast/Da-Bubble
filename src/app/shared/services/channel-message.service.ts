import { Injectable } from '@angular/core';
import { Firestore, collectionData, addDoc, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';

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
}
