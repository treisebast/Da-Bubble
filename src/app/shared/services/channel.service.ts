import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, updateDoc, deleteDoc, collection, addDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.model';
import { Message } from '../models/message.model';
import { query, orderBy } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  private channelsCollection = collection(this.firestore, 'channels');

  constructor(private firestore: Firestore) {}

  getChannels(): Observable<Channel[]> {
    const channelsQuery = query(this.channelsCollection, orderBy('createdAt', 'asc'));
    return collectionData(channelsQuery, { idField: 'id' }) as Observable<Channel[]>;
  }

  getChannel(id: string): Observable<Channel> {
    const channelDoc = doc(this.firestore, `channels/${id}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<Channel>;
  }

  async addChannel(channel: Channel): Promise<void> {
    const docRef = await addDoc(this.channelsCollection, channel);
    await updateDoc(doc(this.firestore, `channels/${docRef.id}`), { id: docRef.id });
  }

  updateChannel(channel: Channel): Promise<void> {
    const channelDoc = doc(this.firestore, `channels/${channel.id}`);
    return updateDoc(channelDoc, { ...channel });
  }

  deleteChannel(id: string): Promise<void> {
    const channelDoc = doc(this.firestore, `channels/${id}`);
    return deleteDoc(channelDoc);
  }

  getChannelMessages(channelId: string): Observable<Message[]> {
    const messagesCollection = collection(this.firestore, `channels/${channelId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<Message[]>;
  }
}
