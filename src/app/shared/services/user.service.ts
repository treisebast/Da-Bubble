import { Injectable } from '@angular/core';
import { Firestore, doc, docData, collectionData, collection, setDoc, updateDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersCollection = collection(this.firestore, 'users');
  private lastTwoEmojisSubject = new BehaviorSubject<string[]>([]);
  lastTwoEmojis$ = this.lastTwoEmojisSubject.asObservable();
  private localStorageKey = 'lastTwoEmojis';

  constructor(private firestore: Firestore) {
    this.loadEmojisFromLocalStorage();
  }


  /**
   * Gets all users from the Firestore collection.
   * @returns {Observable<User[]>} An observable array of users.
   */
  getUsers(): Observable<User[]> {
    return collectionData(this.usersCollection, { idField: 'userId' }) as Observable<User[]>;
  }


  /**
   * Gets a specific user by ID from the Firestore collection.
   * @param {string} id - The ID of the user.
   * @returns {Observable<User>} An observable of the user.
   */
  getUser(id: string): Observable<User> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return docData(userDoc, { idField: 'userId' }) as Observable<User>;
  }


  /**
   * Adds a new user to the Firestore collection.
   * @param {User} user - The user to add.
   * @returns {Promise<void>} A promise that resolves when the user is added.
   */
  addUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return setDoc(userDoc, user);
  }


  /**
   * Updates an existing user in the Firestore collection.
   * @param {User} user - The user to update.
   * @returns {Promise<void>} A promise that resolves when the user is updated.
   */
  updateUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return updateDoc(userDoc, { ...user });
  }


  /**
   * Deletes a user from the Firestore collection by ID.
   * @param {string} id - The ID of the user.
   * @returns {Promise<void>} A promise that resolves when the user is deleted.
   */
  deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return deleteDoc(userDoc);
  }


  /**
 * Fetches the name of the user by a specific user ID from the Firestore.
 * @param userId The ID of the user to fetch.
 * @returns A promise that resolves to the user's name.
 */
  async getUserNameById(userId: string): Promise<string | null> {
    const userRef = doc(this.firestore, `users/${userId}`);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      return userData['name'];
    } else {
      return null;
    }
  }


  /**
 * Updates the last two emojis and saves them to the local storage.
 * @param emojis An array of emojis to be set as the last two emojis.
 */
  setLastTwoEmojis(emojis: string[]) {
    this.lastTwoEmojisSubject.next(emojis.slice(0, 2));
    this.saveEmojisToLocalStorage(emojis.slice(0, 2));
  }


  /**
 * Retrieves the last two emojis stored in the behavior subject.
 * @returns An array of the last two emojis.
 */
  getLastTwoEmojis(): string[] {
    return this.lastTwoEmojisSubject.getValue();
  }


  /**
 * Adds a new emoji to the list of last two emojis.
 * If the emoji already exists, it will be moved to the front of the array.
 * @param emoji The emoji to be added or moved to the front.
 */
  addEmoji(emoji: string) {
    let currentEmojis = this.getLastTwoEmojis();
    currentEmojis = currentEmojis.filter(e => e !== emoji);
    const updatedEmojis = [emoji, ...currentEmojis].slice(0, 2);
    this.setLastTwoEmojis(updatedEmojis);
  }


  /**
 * Loads the last two emojis from local storage and updates the behavior subject.
 * If no emojis are found in local storage, the behavior subject remains unchanged.
 */
  private loadEmojisFromLocalStorage() {
    const savedEmojis = localStorage.getItem(this.localStorageKey);
    if (savedEmojis) {
      this.lastTwoEmojisSubject.next(JSON.parse(savedEmojis));
    }
  }

  /**
 * Saves the last two emojis to the local storage.
 * @param emojis An array of emojis to be saved in local storage.
 */
  private saveEmojisToLocalStorage(emojis: string[]) {
    localStorage.setItem(this.localStorageKey, JSON.stringify(emojis));
  }
}
