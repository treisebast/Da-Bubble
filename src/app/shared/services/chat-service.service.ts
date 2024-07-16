import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, updateDoc, deleteDoc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private channelsCollection = collection(this.firestore, 'channels');

  constructor(private firestore: Firestore) {}

  getChannels(): Observable<Channel[]> {
    return collectionData(this.channelsCollection, { idField: 'id' }) as Observable<Channel[]>;
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
}
