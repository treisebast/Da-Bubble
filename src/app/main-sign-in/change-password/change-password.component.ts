import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../shared/services/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    CommonModule,
    MatIconModule,
    MatCardModule,
    RouterOutlet,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  changePasswordForm: FormGroup;
  oobCode: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.changePasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode');
  }

  get newPassword() {
    return this.changePasswordForm.get('newPassword')!;
  }

  get confirmPassword() {
    return this.changePasswordForm.get('confirmPassword')!;
  }

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')!.value;
    const confirmPassword = control.get('confirmPassword')!.value;

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      control.get('confirmPassword')!.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (control.get('confirmPassword')!.hasError('passwordMismatch')) {
        control.get('confirmPassword')!.setErrors(null);
      }
      return null;
    }
  };

  onSubmit() {
    if (this.changePasswordForm.valid && this.oobCode) {
      const newPassword = this.changePasswordForm.value.newPassword;
      this.authService.confirmPasswordReset(this.oobCode, newPassword).subscribe({
        next: () => {
          console.log('Password has been successfully changed');
          this.showConfirmationDialog();
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          console.error('Error resetting password', error);
        }
      });
    }
  }

  showConfirmationDialog() {
    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: 'Ihr Passwort wurde erfolgreich geändert.',
        image: ''
      }
    });
  }
}