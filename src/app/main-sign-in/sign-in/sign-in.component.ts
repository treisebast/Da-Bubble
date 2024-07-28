import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
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


@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterModule, CommonModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
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
    private dialog: MatDialog
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
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
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
    await firstValueFrom(this.authService.updateUserProfile(user, { photoURL }));
    console.log('User profile updated with photoURL');
  }


  /**
    * Handles errors during the sign-in process.
    * @param {any} err - The error object.
    * @private
    */
  private handleError(err: any) {
    console.error('Sign-In Error', err);
    this.signInError = err.message;
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

    console.log('Sign-In Successful', credential);
    this.showConfirmationDialog();
    this.router.navigate(['/main']);
  }


  /**
 * Opens a confirmation dialog upon successful sign-in.
 * @private
 */
  private showConfirmationDialog() {
    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: 'Erfolgreich angemeldet'
      }
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
            await this.updateUserProfile(user);
          }
          return res;
        })
      )
    );

    console.log('Guest Sign-In Successful', credential);
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
 * Signs in the user with Google authentication.
 * @param {Event} event - The event object.
 */
  signInWithGoogle(event: Event) {
    event.preventDefault();
    this.authService.signInWithGoogle().subscribe({
      next: (res: any) => {
        console.log('Google Sign-In Successful', res);
        this.router.navigate(['/main']);
      },
      error: (err: any) => {
        console.error('Google Sign-In Error', err);
      }
    });
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