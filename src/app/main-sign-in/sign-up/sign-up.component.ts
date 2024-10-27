import { Component, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, MatCardModule, RouterOutlet, RouterModule, ReactiveFormsModule],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent {
  signUpForm: FormGroup;
  isPrivacyPolicyAccepted: boolean = false;
  emailError: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    /**
     * @type {FormGroup}
     * @description The sign-up form group containing name, email, and password fields with their respective validators.
     */
    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }


  /**
   * Gets the name form control.
   * @returns {AbstractControl} The name form control.
   */
  get name(): AbstractControl {
    return this.signUpForm.get('name')!;
  }


  /**
   * Gets the email form control.
   * @returns {AbstractControl} The email form control.
   */
  get email(): AbstractControl {
    return this.signUpForm.get('email')!;
  }


  /**
   * Gets the password form control.
   * @returns {AbstractControl} The password form control.
   */
  get password(): AbstractControl {
    return this.signUpForm.get('password')!;
  }


  /**
    * Handles form submission for user sign-up.
    * @param {Event} event - The form submission event.
    */
  async onSubmit(event: Event) {
    event.preventDefault();

    if (this.signUpForm.valid && this.isPrivacyPolicyAccepted) {
      const { name, email, password } = this.signUpForm.value;

      try {
        const user = await this.signUpUser(email, password);
        await this.updateUserProfile(user, name);
        const userObj = this.createUserObject(user.uid, name, email);
        await this.saveUserDetails(userObj);
        this.showConfirmationDialog('Konto erfolgreich erstellt!');
        this.redirectToAvatarPage(name);
      } catch (error: any) {
        this.handleSignUpError(error);
      }
    }
  }


  /**
 * Signs up the user with the given email and password.
 * @private
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<any>} A promise that resolves to the user credential.
 */
  private async signUpUser(email: string, password: string): Promise<any> {
    const credential = await firstValueFrom(this.authService.signUp(email, password));
    console.log('New User ID:', credential.user?.uid);
    return credential.user;
  }


  /**
   * Updates the user profile with the given name.
   * @private
   * @param {any} user - The user object.
   * @param {string} name - The user's name.
   * @returns {Promise<void>} A promise that resolves when the user profile is updated.
   */
  private async updateUserProfile(user: any, name: string): Promise<void> {
    if (user) {
      const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
      const photoURL = userDoc?.avatar || '';
      await firstValueFrom(this.authService.updateUserProfile(user, { displayName: name, photoURL }));
      console.log('User profile updated with display name and photoURL');
    }
  }


  /**
   * Creates a user object with the given details.
   * @private
   * @param {string} uid - The user's UID.
   * @param {string} name - The user's name.
   * @param {string} email - The user's email.
   * @returns {User} The created user object.
   */
  private createUserObject(uid: string, name: string, email: string): User {
    return {
      userId: uid,
      name: name,
      email: email,
      avatar: '',
      status: 'online',
      lastSeen: new Date()
    };
  }


  /**
   * Saves the user details to the database.
   * @private
   * @param {User} userObj - The user object to save.
   * @returns {Promise<void>} A promise that resolves when the user details are saved.
   */
  private async saveUserDetails(userObj: User): Promise<void> {
    await this.userService.addUser(userObj);
    console.log('User registered and details saved');
  }


  /**
  * Shows a confirmation dialog with the given message.
  * @private
  * @param {string} message - The message to display in the confirmation dialog.
  */
  private showConfirmationDialog(message: string): void {
    this.dialog.open(ConfirmationDialogComponent, {
      data: { message: message },
      hasBackdrop: false
    });
  }


  /**
  * Redirects to the avatar selection page with the user's name.
  * @private
  * @param {string} userName - The user's name.
  */
  private redirectToAvatarPage(userName: string): void {
    this.router.navigate(['/avatar'], { state: { userName: userName } });
  }


  /**
  * Handles errors during sign-up and user detail saving.
  * @private
  * @param {any} error - The error object.
  */
  private handleSignUpError(error: any): void {
    if (error.code === 'auth/email-already-in-use') {
      this.emailError = 'Diese E-Mail existiert bereits.';
    } else {
      this.emailError = 'Diese E-mail ist ungültig.';
    }
    this.cdr.detectChanges();
  }
}
