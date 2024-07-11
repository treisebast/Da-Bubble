import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private auth: Auth) {}

  signUp(email: string, password: string): Observable<any> {
    // Logik zur Benutzerregistrierung
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  signIn(email: string, password: string): Observable<any> {
    // Logik zur Benutzeranmeldung
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  signOut(): Observable<any> {
    // Logik zur Benutzerabmeldung
    return from(signOut(this.auth));
  }

  getUser(): Observable<any> {
    // Rückgabe des aktuellen Benutzers
    return authState(this.auth);
  }
}
