import { Injectable } from '@angular/core';
import { Firestore, collectionData, doc, docData, setDoc, updateDoc, deleteDoc, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersCollection = collection(this.firestore, 'users');

  constructor(private firestore: Firestore) {}

  getUsers(): Observable<any[]> {
    return collectionData(this.usersCollection, { idField: 'id' }) as Observable<any[]>;
  }

  getUser(id: string): Observable<any> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return docData(userDoc, { idField: 'id' }) as Observable<any>;
  }

  addUser(user: any): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.id}`);
    return setDoc(userDoc, user);
  }

  updateUser(user: any): Promise<void> {
    const userDoc = doc(this.firestore, `users/${user.id}`);
    return updateDoc(userDoc, user);
  }

  deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return deleteDoc(userDoc);
  }
}
