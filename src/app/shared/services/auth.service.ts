import { Injectable, isDevMode, OnDestroy } from '@angular/core';
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
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
} from '@angular/fire/auth';
import { from, Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { doc, Firestore, onSnapshot, setDoc } from '@angular/fire/firestore';
import { UserService } from './user.service';
import { ChannelService } from './channel.service';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private awayTimeout?: number;
  private offlineTimeout?: number;
  private readonly AWAY_LIMIT = 25000;
  private readonly OFFLINE_LIMIT = 600000;
  private currentStatus: 'online' | 'away' | 'offline' = 'offline';
  private statusListeners: Map<string, () => void> = new Map();
  private authStateSubscription!: Subscription;
  private destroy$ = new Subject<void>();
  // private auth: Auth;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private userService: UserService,
    private channelService: ChannelService,
    private cacheService: CacheService
  ) {
    this.checkAndSetUserOnlineStatus();
    this.monitorUserActivity();
    // this.auth = getAuth();
  }

  /**
   * Erneut die Authentifizierung des Benutzers mit Passwort.
   * @param password Passwort des Benutzers
   */
  reauthenticateUser(password: string) {
    const user = this.auth.currentUser;
    if (user?.email) {
      const credential = EmailAuthProvider.credential(user.email, password);
      return reauthenticateWithCredential(user, credential);
    } else {
      return Promise.reject('No user is currently signed in.');
    }
  }

  /**
   * Aktualisiert die E-Mail-Adresse des angemeldeten Benutzers.
   * @param newEmail Neue E-Mail-Adresse
   */
  updateUserEmail(newEmail: string) {
    const user = this.auth.currentUser;
    return updateEmail(user!, newEmail);
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * It performs cleanup by signaling observable completions and unsubscribing from active subscriptions.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
  }

  /**
   * Listens to real-time updates for the current user's status.
   */
  private listenToUserStatusUpdates(userId: string): void {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const status = data['status'] as 'online' | 'away' | 'offline';
        }
      },
      (error) => {
        console.error(
          `Error listening to status updates for user ${userId}:`,
          error
        );
      }
    );
    this.statusListeners.set(userId, unsubscribe);
  }

  /**
   * Removes the status listener for a specific user.
   * @param userId - The user ID.
   */
  public removeUserStatusListener(userId: string): void {
    const unsubscribe = this.statusListeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.statusListeners.delete(userId);
      if (isDevMode()) {
        // console.log(`[AuthService] [DevMode] Status Listener removed for user: ${userId}`);
      }
    }
  }

  /**
   * Monitors user activity and updates the user's online status.
   */
  private monitorUserActivity(): void {
    document.addEventListener('mousemove', this.setOnlineStatus.bind(this));
    document.addEventListener('keydown', this.setOnlineStatus.bind(this));
    this.resetTimeouts();
  }

  /**
   * Sets the user's status to 'online' and resets activity timeouts.
   */
  private setOnlineStatus(): void {
    if (this.auth.currentUser && this.currentStatus !== 'online') {
      this.setUserOnlineStatus(this.auth.currentUser.uid, 'online');
      this.currentStatus = 'online';
    }
    this.resetTimeouts();
  }

  /**
   * Resets the timeouts for setting user status to 'away' and 'offline'.
   */
  private resetTimeouts(): void {
    clearTimeout(this.awayTimeout);
    clearTimeout(this.offlineTimeout);

    this.awayTimeout = window.setTimeout(() => {
      if (this.auth.currentUser && this.currentStatus !== 'away') {
        this.setUserOnlineStatus(this.auth.currentUser.uid, 'away');
        this.currentStatus = 'away';
      }
    }, this.AWAY_LIMIT);

    this.offlineTimeout = window.setTimeout(() => {
      if (this.auth.currentUser && this.currentStatus !== 'offline') {
        this.setUserOnlineStatus(this.auth.currentUser.uid, 'offline');
        this.currentStatus = 'offline';
      }
    }, this.OFFLINE_LIMIT);
  }

  /**
   * Registers a new user with email and password.
   * @param email - User's email address.
   * @param password - User's password.
   * @returns Observable of the authentication result.
   */
  signUp(email: string, password: string): Observable<any> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Overrides the sign-in method to include status listener.
   * @param email - User's email address.
   * @param password - User's password.
   * @returns Observable of the sign-in result.
   */
  signIn(email: string, password: string): Observable<any> {
    return from(
      signInWithEmailAndPassword(this.auth, email, password).then((result) => {
        if (result.user) {
          this.setUserOnlineStatus(result.user.uid, 'online');
          this.monitorVisibility(result.user.uid);
          this.addUnloadEvent(result.user.uid);
          this.listenToUserStatusUpdates(result.user.uid);
          this.userService.listenToUserUpdates(result.user.uid);
          this.channelService.listenToChannelUpdates();
        }
        return result;
      })
    );
  }

  /**
   * Overrides the sign-in with Google method to include status listener.
   * @returns Observable of the authentication result.
   */
  signInWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    return from(
      signInWithPopup(this.auth, provider).then((result) => {
        if (result.user) {
          this.setUserOnlineStatus(result.user.uid, 'online');
          this.monitorVisibility(result.user.uid);
          this.addUnloadEvent(result.user.uid);
          this.listenToUserStatusUpdates(result.user.uid);
          this.userService.listenToUserUpdates(result.user.uid);
          this.channelService.listenToChannelUpdates();
        }
        return result;
      })
    );
  }

  /**
   * Overrides the sign-out method to remove all status listeners.
   * @returns Observable of the sign-out result.
   */
  signOut(): Observable<any> {
    return from(
      this.auth.currentUser
        ? this.setUserOnlineStatus(this.auth.currentUser.uid, 'offline').then(
            () => {
              this.removeUserStatusListener(this.auth.currentUser!.uid);
              this.userService.removeAllUserListeners();
              this.channelService.removeAllChannelListeners();
              this.cacheService.clearAll();
              return signOut(this.auth);
            }
          )
        : signOut(this.auth)
    );
  }

  /**
   * Gets the current authenticated user as an observable.
   * @returns Observable of the current user or null.
   */
  getUser(): Observable<FirebaseUser | null> {
    return authState(this.auth);
  }

  /**
   * Returns the currently authenticated user.
   * @returns The current Firebase user or null if no user is authenticated.
   */
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Updates the user's profile with the given information.
   * @param user - The current Firebase user.
   * @param profile - Object containing displayName and/or photoURL.
   * @returns Observable that completes when the profile is updated.
   */
  updateUserProfile(
    user: FirebaseUser,
    profile: { displayName?: string; photoURL?: string }
  ): Observable<void> {
    return from(updateProfile(user, profile));
  }

  /**
   * Sends a password reset email to the specified email address.
   * @param email - User's email address.
   * @returns Observable that completes when the email is sent.
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
   * @param code - The password reset code.
   * @param newPassword - The new password.
   * @returns Observable that completes when the password is reset.
   */
  confirmPasswordReset(code: string, newPassword: string): Observable<void> {
    return from(confirmPasswordReset(this.auth, code, newPassword));
  }

  /**
   * Sets the user's online status in Firestore.
   * @param userId - The user's ID.
   * @param status - The new status ('online', 'away', or 'offline').
   * @returns Promise that resolves when the status is updated.
   */
  private setUserOnlineStatus(
    userId: string,
    status: 'online' | 'away' | 'offline'
  ): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return setDoc(
      userDocRef,
      {
        status: status,
        lastSeen: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  /**
   * Adds an event listener to set the user's status to 'offline' before the window unloads.
   * @param userId - The user's ID.
   */
  private addUnloadEvent(userId: string): void {
    window.addEventListener('beforeunload', () => {
      this.setUserOnlineStatus(userId, 'offline');
    });
  }

  /**
   * Monitors document visibility to update user's online status.
   * @param userId - The user's ID.
   */
  private monitorVisibility(userId: string): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.setUserOnlineStatus(userId, 'online');
      } else {
        this.setUserOnlineStatus(userId, 'away');
      }
    });
  }

  /**
   * Checks the authentication state and sets the user's online status.
   */
  private checkAndSetUserOnlineStatus(): void {
    this.getUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.setUserOnlineStatus(user.uid, 'online');
          this.monitorVisibility(user.uid);
          this.addUnloadEvent(user.uid);
          this.listenToUserStatusUpdates(user.uid);
          this.userService.listenToUserUpdates(user.uid);
          this.channelService.listenToChannelUpdates();
        } else {
          this.userService.removeAllUserListeners();
          this.channelService.removeAllChannelListeners();
        }
      });
  }
}
