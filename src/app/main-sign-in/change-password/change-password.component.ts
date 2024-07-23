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


@Component({
  selector: 'app-change-password',
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
    private authService: AuthService // AuthService injizieren
  ) {
    this.changePasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Extrahiere das oobCode-Parameter aus der URL
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
          this.router.navigate(['/login']); // Nach erfolgreicher Passwortänderung weiterleiten
        },
        error: (error: any) => {
          console.error('Error resetting password', error);
          // Fehlerbehandlung hinzufügen
        }
      });
    }
  }
}