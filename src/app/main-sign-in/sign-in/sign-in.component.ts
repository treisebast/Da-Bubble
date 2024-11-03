import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { firstValueFrom, switchMap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { ChangeDetectorRef } from '@angular/core';
import { ChannelService } from '../../shared/services/channel.service';
import { NewChannel } from '../../shared/models/channel.model';
import { User } from '../../shared/models/user.model';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterModule, CommonModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
})
export class SignInComponent {
  signInForm!: FormGroup;
  formSubmitted = false;
  signInError: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog,
    private channelService: ChannelService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  /**
   * Gets the email form control.
   * @returns {AbstractControl} The email form control.
   */
  get email(): AbstractControl {
    return this.signInForm.get('email')!;
  }

  /**
   * Gets the password form control.
   * @returns {AbstractControl} The password form control.
   */
  get password(): AbstractControl {
    return this.signInForm.get('password')!;
  }

  /**
   * Initializes the sign-in form with form controls and validation rules.
   * @private
   */
  private initializeForm() {
    const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

    this.signInForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(emailPattern)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
    });
  }

  /**
   * Updates the user profile with additional information.
   * @param {any} user - The user object.
   * @private
   */
  private async updateUserProfile(user: any) {
    const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
    const photoURL = userDoc?.avatar || '';
    await firstValueFrom(
      this.authService.updateUserProfile(user, { photoURL })
    );
  }

  /**
   * Handles errors during the sign-in process.
   * @param {any} err - The error object.
   * @private
   */
  private handleError(err: any) {
    switch (err.code) {
      case 'auth/invalid-credential':
        this.signInError = 'Ungültige Anmeldedaten.';
        break;
      case 'auth/user-not-found':
        this.signInError = 'Benutzer nicht gefunden.';
        break;
      case 'auth/wrong-password':
        this.signInError = 'Falsches Passwort.';
        break;
      default:
        this.signInError = 'Anmeldefehler.';
        break;
    }
    this.cdr.detectChanges();
  }

  /**
   * Signs in the user with the given email and password.
   * @param {string} email - The user's email address.
   * @param {string} password - The user's password.
   * @private
   */
  private async signIn(email: string, password: string) {
    const credential = await firstValueFrom(
      this.authService.signIn(email, password).pipe(
        switchMap(async (res) => {
          const user = res.user;
          if (user) {
            await this.updateUserProfile(user);
          }
          return res;
        })
      )
    );
    this.showConfirmationDialog();
  }

  /**
   * Opens a confirmation dialog upon successful sign-in.
   * @private
   */
  private showConfirmationDialog() {
    this.dialog.closeAll();
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          message: 'Erfolgreich angemeldet',
        },
        hasBackdrop: false,
      })
      .afterOpened()
      .subscribe(() => {
        setTimeout(() => {
          this.dialog.closeAll();
          this.router.navigate(['/main']);
        }, 1600);
      });
  }

  /**
   * Signs in a guest user with predefined credentials.
   * @param {string} guestEmail - The guest email address.
   * @param {string} guestPassword - The guest password.
   * @private
   */
  private async signInGuest(guestEmail: string, guestPassword: string) {
    const credential = await firstValueFrom(
      this.authService.signIn(guestEmail, guestPassword).pipe(
        switchMap(async (res) => {
          const user = res.user;
          if (user) {
            const userDoc = (await firstValueFrom(
              this.userService.getUser(user.uid)
            )) as User | null;
            const guestUserData: Partial<User> = {
              userId: user.uid,
              name: 'Gast',
              email: guestEmail,
              avatar: '../assets/img/profile/4.svg',
              status: 'online',
              lastSeen: new Date().toISOString(),
            };

            if (!userDoc) {
              await this.userService.addUser(guestUserData as User);
            } else {
              const updatedData: Partial<User> = {};
              for (const key in guestUserData) {
                if (
                  guestUserData[key as keyof User] &&
                  !userDoc[key as keyof User]
                ) {
                  updatedData[key as keyof User] =
                    guestUserData[key as keyof User]!;
                }
              }
              if (Object.keys(updatedData).length > 0) {
                updatedData.userId = user.uid;
                await this.userService.updateUser(updatedData as User);
              }
            }

            await this.addUserToDeveloperTeamChannel(user.uid);
          }
          return res;
        })
      )
    );

    this.showConfirmationDialog();
    this.router.navigate(['/main']);
  }

  /**
   * Handles form submission for user sign-in.
   * @async
   */
  async onSubmit() {
    this.formSubmitted = true;
    if (this.signInForm.valid) {
      const { email, password } = this.signInForm.value;
      try {
        await this.signIn(email, password);
      } catch (err: any) {
        this.handleError(err);
      }
    }
  }

  /**
   * Signs in the user using Google authentication.
   * @param {Event} event - The event object.
   */
  async signInWithGoogle(event: Event) {
    event.preventDefault();
    const res = await firstValueFrom(this.authService.signInWithGoogle());
    const user = res.user;
    if (user) {
      await this.handleGoogleUser(user);
    }
    this.router.navigate(['/main']);
  }

  /**
   * Handles the user object after Google sign-in.
   * Checks if the user exists in Firestore, and if not, adds them.
   * @param {any} user - The Google authenticated user.
   * @private
   */
  private async handleGoogleUser(user: any) {
    const userDoc = await firstValueFrom(this.userService.getUser(user.uid));

    if (!userDoc) {
      await this.addNewGoogleUser(user);
    } else {
      await this.userService.updateUser({
        userId: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        avatar: user.photoURL || 'assets/img/profile/fallback_user.png',
        status: 'online',
        lastSeen: new Date().toISOString(),
      });
    }
    await this.addUserToDeveloperTeamChannel(user.uid);
  }

  /**
   * Adds a new Google authenticated user to Firestore.
   * @param {any} user - The Google authenticated user.
   * @private
   */
  private async addNewGoogleUser(user: any) {
    const newUser = {
      userId: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      avatar: user.photoURL || 'assets/img/profile/fallback_user.png',
      status: 'online',
      lastSeen: new Date().toISOString(),
    };
    await this.userService.addUser(newUser);
  }

  private async addUserToDeveloperTeamChannel(userId: string): Promise<void> {
    const channelName = 'Entwicklerteam';
    let channel = await this.channelService.getChannelByName(
      channelName,
      false
    );

    if (!channel) {
      channel = {
        id: '',
        name: channelName,
        isPrivate: false,
        description:
          'Dieser Channel ist für alles rund um #Entwicklerteam vorgesehen. Hier kannst du zusammen mit deinem Team Meetings abhalten, Dokumente teilen und Entscheidungen treffen.',
        members: [userId],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const channelRef = await this.channelService.addChannel(
        channel as NewChannel
      );
      channel.id = channelRef.id;
    } else {
      if (!channel.members.includes(userId)) {
        await this.channelService.updateChannel(channel, {
          members: [...channel.members, userId],
          updatedAt: new Date(),
        });
      }
    }
  }

  /**
   * Signs in as guest.
   * @param {Event} event - The event object.
   * @async
   */
  async guestLogin(event: Event) {
    event.preventDefault();
    const guestEmail = 'guest@email.com';
    const guestPassword = 'guestDaBubble';
    try {
      await this.signInGuest(guestEmail, guestPassword);
    } catch (err: any) {
      this.handleError(err);
      this.signInError = 'Fehler beim Gäste-Login.';
    }
  }
}
