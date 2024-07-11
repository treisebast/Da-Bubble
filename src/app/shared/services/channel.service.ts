// src/app/services/channel.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, setDoc, updateDoc, deleteDoc, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  private channelsCollection = collection(this.firestore, 'channels');

  constructor(private firestore: Firestore) {}

  getChannels(): Observable<any[]> {
    return collectionData(this.channelsCollection, { idField: 'id' }) as Observable<any[]>;
  }

  getChannel(id: string): Observable<any> {
    const channelDoc = doc(this.firestore, `channels/${id}`);
    return docData(channelDoc, { idField: 'id' }) as Observable<any>;
  }

  addChannel(channel: any): Promise<void> {
    const channelDoc = doc(this.firestore, `channels/${channel.id}`);
    return setDoc(channelDoc, channel);
  }

  updateChannel(channel: any): Promise<void> {
    const channelDoc = doc(this.firestore, `channels/${channel.id}`);
    return updateDoc(channelDoc, channel);
  }

  deleteChannel(id: string): Promise<void> {
    const channelDoc = doc(this.firestore, `channels/${id}`);
    return deleteDoc(channelDoc);
  }
}
