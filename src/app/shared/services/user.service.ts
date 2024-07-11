import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, setDoc, updateDoc, deleteDoc, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersCollection = collection(this.firestore, 'users');

  constructor(private firestore: Firestore) {}

  getUsers(): Observable<User[]> {
    return collectionData(this.usersCollection, { idField: 'userId' }) as Observable<User[]>;
  }

  getUser(id: string): Observable<User> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return docData(userDoc, { idField: 'userId' }) as Observable<User>;
  }

  addUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return setDoc(userDoc, { ...user });
  }

  updateUser(user: User): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.userId}`);
    return updateDoc(userDoc, { ...user });
  }

  deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return deleteDoc(userDoc);
  }
}
