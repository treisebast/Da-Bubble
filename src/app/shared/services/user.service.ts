import { Injectable } from '@angular/core';
import { Firestore, collectionData, docData, setDoc, doc, collection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestore: Firestore) {}

  getUserById(userId: string): Observable<any> {
    // Benutzer anhand der ID abrufen
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return docData(userDocRef);
  }

  updateUser(user: any): Promise<void> {
    // Benutzerinformationen aktualisieren
    const userDocRef = doc(this.firestore, `users/${user.id}`);
    return setDoc(userDocRef, user);
  }

  getAllUsers(): Observable<any[]> {
    // Alle Benutzer abrufen
    const usersCollectionRef = collection(this.firestore, 'users');
    return collectionData(usersCollectionRef);
  }
}
