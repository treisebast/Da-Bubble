import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
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


@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, MatCardModule, RouterOutlet, RouterModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})

export class ResetPasswordComponent {
  resetPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }


  /**
    * Gets the email form control.
    * @returns {AbstractControl} The email form control.
    */
  get email(): AbstractControl {
    return this.resetPasswordForm.get('email')!;
  }


  /**
   * Handles the form submission.
   */
  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      this.handlePasswordReset(this.email.value);
    }
  }


  /**
   * Initiates the password reset process.
   * @param {string} email - The email address to send the reset link to.
   */
  private handlePasswordReset(email: string): void {
    this.authService.sendPasswordResetEmail(email).subscribe({
      next: () => this.onPasswordResetSuccess(),
      error: (error: any) => this.onPasswordResetError(error)
    });
  }


  /**
   * Handles successful password reset email submission.
   */
  private onPasswordResetSuccess(): void {
    this.openDialog('E-Mail gesendet', './assets/img/front-page/send.svg');
  }

  /**
   * Handles error during password reset email submission.
   * @param {any} error - The error object.
   */
  private onPasswordResetError(error: any): void {
    this.openDialog('Fehler beim Senden der E-Mail', '');
  }

  /**
   * Opens a dialog with the given message and image.
   * @param {string} message - The message to display.
   * @param {string} image - The image to display.
   */
  private openDialog(message: string, image: string): void {
    this.dialog.closeAll();
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { message, image },
      hasBackdrop: false
    });
    setTimeout(() => dialogRef.close(), 2000);
  }
}
