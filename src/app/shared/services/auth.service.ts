import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  authState,
  User as FirebaseUser,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from '@angular/fire/auth';
import { from, Observable } from 'rxjs';
import { updateProfile } from '@angular/fire/auth';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private auth: Auth, private firestore: Firestore) {
    this.checkAndSetUserOnlineStatus();
  }

  /**
   * Signs up a new user with email and password.
   * @param {string} email - The email of the new user.
   * @param {string} password - The password of the new user.
   * @returns {Observable<any>} - An observable of the authentication result.
   */
  signUp(email: string, password: string): Observable<any> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Signs in a user with the provided email and password.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns An Observable that emits the sign-in result.
   */
  signIn(email: string, password: string): Observable<any> {
    return from(
      signInWithEmailAndPassword(this.auth, email, password).then((result) => {
        if (result.user) {
          this.setUserOnlineStatus(result.user.uid, 'online');
          this.monitorVisibility(result.user.uid);
          this.addUnloadEvent(result.user.uid);
        }
        return result;
      })
    );
  }

  /**
   * Signs in the user with Google authentication.
   * @returns An Observable that emits the authentication result.
   */
  signInWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider));
  }

  /**
   * Signs out the current user.
   * @returns An Observable that emits the result of the sign out operation.
   */
  signOut(): Observable<any> {
    return from(
      this.auth.currentUser
        ? this.setUserOnlineStatus(this.auth.currentUser.uid, 'offline').then(
            () => signOut(this.auth)
          )
        : signOut(this.auth)
    );
  }

  /**
   * Gets the authentication state of the current user.
   * @returns {Observable<any>} - An observable of the authentication state.
   */
  getUser(): Observable<FirebaseUser | null> {
    return authState(this.auth);
  }

  /**
   * Updates the user's profile.
   * @param {FirebaseUser} user - The user whose profile is being updated.
   * @param {Object} profile - The profile updates.
   * @returns {Observable<void>} - An observable that completes when the profile is updated.
   */
  updateUserProfile(
    user: FirebaseUser,
    profile: { displayName?: string; photoURL?: string }
  ): Observable<void> {
    return from(updateProfile(user, profile));
  }

  /**
   * Sends a password reset email to the given email address.
   * @param {string} email - The email address to send the password reset email to.
   * @returns {Observable<void>} - An observable that completes when the email is sent.
   */
  sendPasswordResetEmail(email: string): Observable<void> {
    const actionCodeSettings = {
      url: 'http://localhost:4200/change-password', // Needs the actual App-HTTPS-Address once we're done
      handleCodeInApp: true,
    };
    return from(sendPasswordResetEmail(this.auth, email, actionCodeSettings));
  }

  /**
   * Confirms the password reset with the given code and new password.
   * @param {string} code - The password reset code.
   * @param {string} newPassword - The new password.
   * @returns {Observable<void>} - An observable that completes when the password is reset.
   */
  confirmPasswordReset(code: string, newPassword: string): Observable<void> {
    return from(confirmPasswordReset(this.auth, code, newPassword));
  }

  /**
   * Sets the online status of a user.
   * @param userId - The ID of the user.
   * @param status - The online status of the user. Can be either 'online' or 'offline'.
   * @returns A promise that resolves when the online status is successfully updated.
   */
  private setUserOnlineStatus(
    userId: string,
    status: 'online' | 'offline'
  ): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return updateDoc(userDocRef, {
      status: status,
      lastSeen: new Date().toISOString(),
    });
  }

  /**
   * Adds an event listener for the 'beforeunload' event to set the user's online status to 'offline' when the window is about to be unloaded.
   * @param userId - The ID of the user.
   */
  private addUnloadEvent(userId: string): void {
    window.addEventListener('beforeunload', () => {
      this.setUserOnlineStatus(userId, 'offline');
    });
  }

  /**
   * Monitors the visibility of the document and sets the user's online status to 'online' when the document becomes visible.
   * @param userId - The ID of the user.
   */
  private monitorVisibility(userId: string): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.setUserOnlineStatus(userId, 'online');
      }
    });
  }

  /**
   * Checks and sets the user's online status.
   * This method retrieves the user and if the user exists, it sets the user's online status to 'online'.
   * It also monitors the visibility of the user and adds an unload event listener.
   */
  private checkAndSetUserOnlineStatus(): void {
    this.getUser().subscribe((user) => {
      if (user) {
        this.setUserOnlineStatus(user.uid, 'online');
        this.monitorVisibility(user.uid);
        this.addUnloadEvent(user.uid);
      }
    });
  }
}
