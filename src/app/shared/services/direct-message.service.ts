import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { DirectMessage } from '../models/directMessage.model';

@Injectable({
  providedIn: 'root'
})
export class DirectMessageService {
  constructor(private firestore: Firestore) {}

  getDirectMessages(chatId: string): Observable<DirectMessage[]> {
    const messagesCollection = collection(this.firestore, `directMessages/${chatId}/messages`);
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<DirectMessage[]>;
  }

  getDirectMessage(chatId: string, messageId: string): Observable<DirectMessage> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${messageId}`);
    return docData(messageDoc, { idField: 'id' }) as Observable<DirectMessage>;
  }

  async addDirectMessage(chatId: string, message: DirectMessage): Promise<void> {
    const messagesCollection = collection(this.firestore, `directMessages/${chatId}/messages`);
    const docRef = await addDoc(messagesCollection, message);
    return updateDoc(doc(this.firestore, `directMessages/${chatId}/messages/${docRef.id}`), { id: docRef.id });
  }

  updateDirectMessage(chatId: string, message: DirectMessage): Promise<void> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${message.id}`);
    return updateDoc(messageDoc, {...message});
  }

  deleteDirectMessage(chatId: string, messageId: string): Promise<void> {
    const messageDoc = doc(this.firestore, `directMessages/${chatId}/messages/${messageId}`);
    return deleteDoc(messageDoc);
  }

  async getOrCreateChat(user1Id: string, user2Id: string): Promise<string> {
    const chatsCollection = collection(this.firestore, `directMessages`);
    const chatQuery = query(
      chatsCollection,
      where('participants', 'array-contains', user1Id)
    );
    const chatDocs = await getDocs(chatQuery);
    let chatId: string | null = null;

    chatDocs.forEach(doc => {
      const data = doc.data();
      if (data['participants'].includes(user2Id)) {
        chatId = doc.id;
      }
    });

    if (!chatId) {
      const chatDocRef = await addDoc(chatsCollection, {
        participants: [user1Id, user2Id]
      });
      chatId = chatDocRef.id;
    }

    return chatId;
  }
}
