import { Injectable } from '@angular/core';
import { Firestore, doc, docData, collectionData, collection, setDoc, updateDoc, deleteDoc, getDoc, query, getDocs, where } from '@angular/fire/firestore';
import { BehaviorSubject, catchError, combineLatest, forkJoin, from, map, Observable, of } from 'rxjs';
import { User } from '../models/user.model';
import { Channel } from '../models/channel.model';

@Injectable({
  providedIn: 'root',
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
    return collectionData(this.usersCollection, {
      idField: 'userId',
    }) as Observable<User[]>;
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

  getUsersByIds(userIds: string[]): Observable<User[]> {
    if (!userIds || userIds.length === 0) {
      return of([]);
    }

    const userObservables = userIds.map((userId) => this.getUser(userId));
    return combineLatest(userObservables);
  }


  /**
   * Gets a specific user by ID from the Firestore collection.
   * @param {string} id - The ID of the user.
   * @returns {Observable<User>} An observable of the user.
   */
  getUsersOnce(userIds: string[]): Observable<User[]> {
    const chunkSize = 10;
    const chunks = [];

    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    const observables = chunks.map(chunk => {
      const q = query(collection(this.firestore, 'users'), where('userId', 'in', chunk));
      return from(getDocs(q)).pipe(
        map(snapshot =>
          snapshot.docs.map(docSnap => ({
            ...docSnap.data(),
            userId: docSnap.id,
          }) as User)
        ),
        catchError(error => {
          console.error('Fehler beim Laden der Benutzer mit getUsersOnce:', error);
          return of([]);
        })
      );
    });

    return forkJoin(observables).pipe(
      map(results => results.flat())
    );
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
    currentEmojis = currentEmojis.filter((e) => e !== emoji);
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

  /**
   * Holt alle Kanäle (öffentliche und private), zu denen der Benutzer gehört.
   * @param userId - Die ID des Benutzers.
   * @returns Observable eines Arrays von Kanälen.
   */
  getUserChannels(userId: string): Observable<Channel[]> {
    const publicChannelsQuery = query(
      collection(this.firestore, 'channels'),
      where('members', 'array-contains', userId)
    );

    const privateChannelsQuery = query(
      collection(this.firestore, 'directMessages'),
      where('members', 'array-contains', userId)
    );

    return combineLatest([
      collectionData(publicChannelsQuery, { idField: 'id' }) as Observable<Channel[]>,
      collectionData(privateChannelsQuery, { idField: 'id' }) as Observable<Channel[]>
    ]).pipe(
      map(([publicChannels, privateChannels]) => [...publicChannels, ...privateChannels])
    );
  }
}
