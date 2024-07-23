import { Injectable } from '@angular/core';
import { Auth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, User as FirebaseUser, GoogleAuthProvider, sendPasswordResetEmail, confirmPasswordReset } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';
import { updateProfile } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private auth: Auth) { }

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


  signInWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
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
  getUser(): Observable<FirebaseUser | null> {
    return authState(this.auth);
  }


  /**
   * Updates the user's profile.
   *
   * @param {FirebaseUser} user - The user whose profile is being updated.
   * @param {Object} profile - The profile updates.
   * @returns {Observable<void>} - An observable that completes when the profile is updated.
   */
  updateUserProfile(user: FirebaseUser, profile: { displayName?: string, photoURL?: string }): Observable<void> {
    return from(updateProfile(user, profile));
  }


  /**
 * Sends a password reset email to the given email address.
 *
 * @param {string} email - The email address to send the password reset email to.
 * @returns {Observable<void>} - An observable that completes when the email is sent.
 */
  sendPasswordResetEmail(email: string): Observable<void> {
    const actionCodeSettings = {
      url: 'http://localhost:4200/change-password', // Needs the actual App-HTTPS-Address once we're done
      handleCodeInApp: true
    };
    return from(sendPasswordResetEmail(this.auth, email, actionCodeSettings));
  }


  /**
    * Confirms the password reset with the given code and new password.
    *
    * @param {string} code - The password reset code.
    * @param {string} newPassword - The new password.
    * @returns {Observable<void>} - An observable that completes when the password is reset.
    */
  confirmPasswordReset(code: string, newPassword: string): Observable<void> {
    return from(confirmPasswordReset(this.auth, code, newPassword));
  }
}