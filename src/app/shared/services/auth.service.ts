import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private auth: Auth) {}

  /**
   * Signs up a new user with email and password.
   *
   * @param {string} email - The email of the new user.
   * @param {string} password - The password of the new user.
   * @returns {Observable<any>} - An observable of the authentication result.
   */
  signUp(email: string, password: string): Observable<any> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }
  

  /**
   * Signs in an existing user with email and password.
   *
   * @param {string} email - The email of the user.
   * @param {string} password - The password of the user.
   * @returns {Observable<any>} - An observable of the authentication result.
   */
  signIn(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }


  /**
   * Signs out the currently authenticated user.
   *
   * @returns {Observable<any>} - An observable that completes when the user is signed out.
   */
  signOut(): Observable<any> {
    return from(signOut(this.auth));
  }


  /**
   * Gets the authentication state of the current user.
   *
   * @returns {Observable<any>} - An observable of the authentication state.
   */
  getUser(): Observable<any> {
    return authState(this.auth);
  }
}

