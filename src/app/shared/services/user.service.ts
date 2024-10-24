import { Injectable, isDevMode, OnDestroy } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  collectionData,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  getDocs,
  where,
  onSnapshot,
} from '@angular/fire/firestore';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  forkJoin,
  from,
  map,
  Observable,
  of,
  Subject,
  takeUntil,
} from 'rxjs';
import { User } from '../models/user.model';
import { Channel } from '../models/channel.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class UserService implements OnDestroy {
  private usersCollection = collection(this.firestore, 'users');
  private lastTwoEmojisSubject = new BehaviorSubject<string[]>([]);
  lastTwoEmojis$ = this.lastTwoEmojisSubject.asObservable();
  private userListeners: Map<string, () => void> = new Map();
  private destroy$ = new Subject<void>();

  constructor(
    private firestore: Firestore,
    private cacheService: CacheService
  ) {
    this.loadEmojisFromLocalStorage();
  }

  ngOnDestroy(): void {
    this.removeAllUserListeners();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Listens to real-time updates for a specific user and updates the cache.
   * @param userId - The ID of the user.
   */
  listenToUserUpdates(userId: string): void {
    if (!this.userListeners.has(userId)) {
      const userDoc = doc(this.firestore, `users/${userId}`);
      const unsubscribe = onSnapshot(userDoc, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          this.cacheService.set(`user-${userId}`, userData); // Echtzeit-Daten, keine TTL
        }
      }, (error) => {
        console.error(`Error listening to user ${userId} updates:`, error);
      });

      this.userListeners.set(userId, unsubscribe);
    }
  }

  /**
   * Removes a user listener.
   * @param userId - The ID of the user.
   */
  removeUserListener(userId: string): void {
    const unsubscribe = this.userListeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.userListeners.delete(userId);
      if (isDevMode()) {
        console.log(`[UserService] Listener removed for user: ${userId}`);
      }
    }
  }

  /**
   * Removes all user listeners.
   */
  removeAllUserListeners(): void {
    this.userListeners.forEach((unsubscribe, key) => {
      unsubscribe();
      this.userListeners.delete(key);
      if (isDevMode()) {
        console.log(`[UserService] Listener removed for key: ${key}`);
      }
    });
  }

  /**
   * Retrieves all users from Firestore with caching and real-time updates.
   * @returns Observable of User array.
   */
  getUsers(): Observable<User[]> {
    const key = 'users-all';
    return this.cacheService.wrap(key, () => {
      const collectionRef = collection(this.firestore, 'users');
      const q = query(collectionRef);
      return collectionData(q, { idField: 'userId' }) as Observable<User[]>;
    });
  }

  /**
   * Retrieves a specific user by ID with caching and real-time updates.
   * @param id - The user ID.
   * @returns Observable of User.
   */
  getUser(id: string): Observable<User> {
    const key = `user-${id}`;
    // Überprüfen, ob bereits ein Listener für diesen Benutzer existiert
    if (!this.userListeners.has(id)) {
      const userDoc = doc(this.firestore, `users/${id}`);
      const unsubscribe = onSnapshot(
        userDoc,
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            userData.userId = docSnap.id;
            this.cacheService.set(key, userData); // Keine TTL für Echtzeit-Daten
          }
        },
        (error) => {
          console.error(`Error listening to user ${id} updates:`, error);
        }
      );

      this.userListeners.set(id, unsubscribe);
    }

    return this.cacheService.wrap(key, () => {
      const userDoc = doc(this.firestore, `users/${id}`);
      return docData(userDoc, { idField: 'userId' }) as Observable<User>;
    });
  }


  /**
   * Retrieves users by a list of IDs with caching.
   * @param userIds - The list of user IDs.
   * @returns Observable of User array.
   */
  getUsersByIds(userIds: string[]): Observable<User[]> {
    if (!userIds || userIds.length === 0) {
      return of([]);
    }

    const userObservables = userIds.map((userId) => this.getUser(userId));
    return combineLatest(userObservables);
  }

  /**
   * Retrieves users once based on a list of IDs.
   * @param userIds - The list of user IDs.
   * @returns Observable of User array.
   */
  getUsersOnce(userIds: string[]): Observable<User[]> {
    const chunkSize = 10;
    const chunks = [];

    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    const observables = chunks.map((chunk) => {
      const q = query(
        collection(this.firestore, 'users'),
        where('userId', 'in', chunk)
      );
      return from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map(
            (docSnap) =>
              ({
                ...docSnap.data(),
                userId: docSnap.id,
              } as User)
          )
        ),
        catchError((error) => {
          console.error(
            'Error loading users with getUsersOnce:',
            error
          );
          return of([]);
        })
      );
    });

    return forkJoin(observables).pipe(map((results) => results.flat()));
  }

  /**
   * Adds a new user to the Firestore collection.
   * @param user - The user to add.
   * @returns A promise that resolves when the user is added.
   */
  addUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return setDoc(userDoc, user);
  }

  /**
   * Updates an existing user in the Firestore collection.
   * @param user - The user to update.
   * @returns A promise that resolves when the user is updated.
   */
  updateUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return updateDoc(userDoc, { ...user });
  }

  /**
   * Deletes a user from the Firestore collection by ID.
   * @param id - The ID of the user.
   * @returns A promise that resolves when the user is deleted.
   */
  deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return deleteDoc(userDoc);
  }

  /**
   * Fetches the name of the user by a specific user ID from Firestore.
   * @param userId - The ID of the user to fetch.
   * @returns A promise resolving to the user's name.
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
   * Sets the last two emojis and saves them to local storage.
   * @param emojis - Array of emojis.
   */
  setLastTwoEmojis(emojis: string[]): void {
    this.lastTwoEmojisSubject.next(emojis.slice(0, 2));
    this.saveEmojisToLocalStorage(emojis.slice(0, 2));
  }

  /**
   * Retrieves the last two emojis.
   * @returns Array of emojis.
   */
  getLastTwoEmojis(): string[] {
    return this.lastTwoEmojisSubject.getValue();
  }

  /**
   * Adds an emoji to the last two emojis.
   * @param emoji - The emoji to add.
   */
  addEmoji(emoji: string): void {
    let currentEmojis = this.getLastTwoEmojis();
    currentEmojis = currentEmojis.filter((e) => e !== emoji);
    const updatedEmojis = [emoji, ...currentEmojis].slice(0, 2);
    this.setLastTwoEmojis(updatedEmojis);
  }

  /**
   * Loads the last two emojis from local storage.
   */
  private loadEmojisFromLocalStorage(): void {
    const savedEmojis = localStorage.getItem('lastTwoEmojis');
    if (savedEmojis) {
      this.lastTwoEmojisSubject.next(JSON.parse(savedEmojis));
    }
  }

  /**
   * Saves the last two emojis to local storage.
   * @param emojis - Array of emojis.
   */
  private saveEmojisToLocalStorage(emojis: string[]): void {
    localStorage.setItem('lastTwoEmojis', JSON.stringify(emojis));
  }

  /**
   * Retrieves all channels (public and private) the user belongs to.
   * @param userId - The user ID.
   * @returns Observable of Channel array.
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
