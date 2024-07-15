import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';


@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    CommonModule, 
    MatIconModule, 
    MatCardModule, 
    RouterOutlet, 
    RouterModule, 
    ReactiveFormsModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})

export class ResetPasswordComponent {
  resetPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private dialog: MatDialog
  ) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.resetPasswordForm.get('email')!;
  }

  onSubmit() {
    if (this.resetPasswordForm.valid) {
      console.log('Reset Password Form Submitted', this.resetPasswordForm.value);
      // Reset-Email send successful 
      this.dialog.open(ConfirmationDialogComponent, {
        data: { 
          message: 'E-Mail gesendet',
          image: './assets/img/front-page/send.svg'
        }
      });
    }
  }
}