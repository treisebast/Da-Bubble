import { Injectable } from '@angular/core';
import {
  Firestore,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, map } from 'rxjs';
import { Message } from '../models/message.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class DirectMessageService {
  constructor(private firestore: Firestore) {}

  /**
   * Get all users with whom the current user has exchanged direct messages.
   * @param {string} currentUserId - The ID of the current user.
   * @returns {Promise<User[]>} - A promise that resolves with an array of users.
   */
  async getUsersWithDirectMessages(currentUserId: string): Promise<User[]> {
    const directMessagesCollection = collection(this.firestore,'directMessages');

    const q = query(directMessagesCollection, where('participants', 'array-contains', currentUserId));
    const querySnapshot = await getDocs(q);

    const users: User[] = [];
    for (const messageDoc of querySnapshot.docs) {
      const participants = messageDoc.data()['participants'];
      const otherUserId = participants.find(
        (id: string) => id !== currentUserId
      );

      if (otherUserId) {
        const userDocRef = doc(this.firestore, `users/${otherUserId}`);
        const userDoc = await firstValueFrom(docData(userDocRef));
        users.push(userDoc as User);
      }
    }

    return users;
  }

  /**
   * Gets all direct messages in a specific chat.
   * @param {string} chatId - The ID of the chat.
   * @returns {Observable<DirectMessage[]>} - An observable array of direct messages.
   */
  getDirectMessages(chatId: string): Observable<Message[]> {
    const messagesCollection = collection(
      this.firestore,
      `directMessages/${chatId}/messages`
    );
    return collectionData(messagesCollection, { idField: 'id' }) as Observable<
      Message[]
    >;
  }

  /**
   * Gets a specific direct message by ID in a specific chat.
   * @param {string} chatId - The ID of the chat.
   * @param {string} messageId - The ID of the message.
   * @returns {Observable<DirectMessage>} - An observable of the direct message.
   */
  getDirectMessage(chatId: string, messageId: string): Observable<Message> {
    const messageDoc = doc(
      this.firestore,
      `directMessages/${chatId}/messages/${messageId}`
    );
    return docData(messageDoc, { idField: 'id' }) as Observable<Message>;
  }

  /**
   * Adds a new direct message to a specific chat.
   * @param {string} chatId - The ID of the chat.
   * @param {DirectMessage} message - The direct message to add.
   * @returns {Promise<void>} - A promise that resolves when the message is added.
   */
  async addDirectMessage(chatId: string, message: Message): Promise<void> {
    const messagesCollection = collection(
      this.firestore,
      `directMessages/${chatId}/messages`
    );
    const docRef = await addDoc(messagesCollection, message);
    return updateDoc(
      doc(this.firestore, `directMessages/${chatId}/messages/${docRef.id}`),
      { id: docRef.id }
    );
  }

  /**
   * Updates an existing direct message in a specific chat.
   * @param {string} chatId - The ID of the chat.
   * @param {DirectMessage} message - The direct message to update.
   * @returns {Promise<void>} - A promise that resolves when the message is updated.
   */
  updateDirectMessage(chatId: string, message: Message): Promise<void> {
    const messageDoc = doc(
      this.firestore,
      `directMessages/${chatId}/messages/${message.id}`
    );
    return updateDoc(messageDoc, { ...message });
  }

  /**
   * Deletes a direct message from a specific chat.
   * @param {string} chatId - The ID of the chat.
   * @param {string} messageId - The ID of the message.
   * @returns {Promise<void>} - A promise that resolves when the message is deleted.
   */
  deleteDirectMessage(chatId: string, messageId: string): Promise<void> {
    const messageDoc = doc(
      this.firestore,
      `directMessages/${chatId}/messages/${messageId}`
    );
    return deleteDoc(messageDoc);
  }

  /**
   * Gets or creates a chat between two users.
   * If a chat already exists between the two users, returns the chat ID.
   * If no chat exists, creates a new chat with the two users and returns the new chat ID.
   *
   * @param {string} user1Id - The ID of the first user.
   * @param {string} user2Id - The ID of the second user.
   * @returns {Promise<string>} - A promise that resolves to the chat ID.
   */
  async getOrCreateChat(user1Id: string, user2Id: string): Promise<string> {
    const chatsCollection = collection(this.firestore, 'directMessages');
    const chatQuery = query(
      chatsCollection,
      where('participants', 'array-contains-any', [user1Id, user2Id])
    );

    const chatDocs = await getDocs(chatQuery);

    for (const chatDoc of chatDocs.docs) {
      const data = chatDoc.data();
      if (
        data['participants'].includes(user1Id) &&
        data['participants'].includes(user2Id)
      ) {
        return chatDoc.id;
      }
    }

    const chatDocRef = await addDoc(chatsCollection, {
      participants: [user1Id, user2Id],
    });

    return chatDocRef.id;
  }
}
