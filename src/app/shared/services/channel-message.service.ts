import { Injectable } from '@angular/core';
import { Firestore, collectionData, addDoc, collection, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';
import { doc, updateDoc } from '@angular/fire/firestore';
@Injectable({
  providedIn: 'root'
})
export class ChannelMessageService{
  collectionPath: string = '';

  constructor(private firestore: Firestore) {}

  getChannelMessages(channelId: string, isPrivate: boolean): Observable<Message[]> {
    this.getCollectionPath(isPrivate);
    const messagesCollection = collection(this.firestore, `${this.collectionPath}/${channelId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<Message[]>;

  }

  async addChannelMessage(channelId: string, message: Message, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messagesCollection = collection(this.firestore, `${this.collectionPath}/${channelId}/messages`);
    await addDoc(messagesCollection, message);
  }

  async editChannelMessage(channelId: string, messageId: string, updatedContent: string, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messageDocRef = doc(this.firestore, `${this.collectionPath}/${channelId}/messages/${messageId}`);
    await updateDoc(messageDocRef, {
      content: updatedContent,
      edited: true,
    });
}

  async deleteChannelMessage(channelId: string, messageId: string, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messageDocRef = doc(this.firestore, `${this.collectionPath}/${channelId}/messages/${messageId}`);
    await deleteDoc(messageDocRef);
  }

  private getCollectionPath(isChannelPrivate: boolean): string {
    this.collectionPath = isChannelPrivate ? 'directMessages' : 'channels';
    return this.collectionPath;
  }

  async updateChannelMessageReactions(channelId: string, messageId: string, reactions: { [emoji: string]: string[] }, isPrivate: boolean): Promise<void> {
    this.getCollectionPath(isPrivate);
    const messageDocRef = doc(this.firestore, `${this.collectionPath}/${channelId}/messages/${messageId}`);
    
    // Check if reactions object is valid before updating
    if (reactions && Object.keys(reactions).length > 0) {
      await updateDoc(messageDocRef, { reactions: reactions });
    } else {
      await updateDoc(messageDocRef, { reactions: {} }); // or delete the field
    }
  }
}
