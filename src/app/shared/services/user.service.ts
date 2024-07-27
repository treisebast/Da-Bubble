import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, updateDoc, deleteDoc, collection, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersCollection = collection(this.firestore, 'users');

  constructor(private firestore: Firestore) {}

  /**
   * Gets all users from the Firestore collection.
   * @returns {Observable<User[]>} - An observable array of users.
   */
  getUsers(): Observable<User[]> {
    return collectionData(this.usersCollection, { idField: 'userId' }) as Observable<User[]>;
  }
  

  /**
   * Gets a specific user by ID from the Firestore collection.
   * @param {string} id - The ID of the user.
   * @returns {Observable<User>} - An observable of the user.
   */
  getUser(id: string): Observable<User> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return docData(userDoc, { idField: 'userId' }) as Observable<User>;
  }

  /**
   * Adds a new user to the Firestore collection.
   * @param {User} user - The user to add.
   * @returns {Promise<void>} - A promise that resolves when the user is added.
   */
  async addUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return setDoc(userDoc, user);
  }

  /**
   * Updates an existing user in the Firestore collection.
   * @param {User} user - The user to update.
   * @returns {Promise<void>} - A promise that resolves when the user is updated.
   */
  updateUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return updateDoc(userDoc, { ...user });
  }

  /**
   * Deletes a user from the Firestore collection by ID.
   * @param {string} id - The ID of the user.
   * @returns {Promise<void>} - A promise that resolves when the user is deleted.
   */
  deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return deleteDoc(userDoc);
  }
}
