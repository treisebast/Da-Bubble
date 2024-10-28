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
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, CommonModule, MatIconModule, MatCardModule, RouterOutlet, RouterModule, ReactiveFormsModule],
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


  /**
   * Initializes the component by retrieving the oobCode from the query parameters.
   */
  ngOnInit(): void {
    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode');
  }


  /**
    * Getter for the newPassword form control.
    * @returns {AbstractControl} The newPassword form control.
    */
  get newPassword(): AbstractControl {
    return this.changePasswordForm.get('newPassword')!;
  }


  /**
   * Getter for the confirmPassword form control.
   * @returns {AbstractControl} The confirmPassword form control.
   */
  get confirmPassword(): AbstractControl {
    return this.changePasswordForm.get('confirmPassword')!;
  }


  /**
   * Validator function to check if the newPassword and confirmPassword fields match.
   * @param {AbstractControl} control - The form group control containing the newPassword and confirmPassword fields.
   * @returns {ValidationErrors | null} A ValidationErrors object if the passwords do not match, otherwise null.
   */
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


  /**
   * Submits the form to change the password.
   * If the form is valid and an oobCode is present, calls the AuthService to reset the password.
   * On success, shows a confirmation dialog and navigates to the login page.
   * On error, logs the error to the console.
   */
  onSubmit() {
    if (this.changePasswordForm.valid && this.oobCode) {
      const newPassword = this.changePasswordForm.value.newPassword;
      this.authService.confirmPasswordReset(this.oobCode, newPassword).subscribe({
        next: () => {
          // console.log('Password has been successfully changed');
          this.showConfirmationDialog();
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          console.error('Error resetting password', error);
        }
      });
    }
  }


  /**
  * Displays a confirmation dialog to the user indicating that the password has been successfully changed.
  */
  showConfirmationDialog() {
    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: 'Ihr Passwort wurde erfolgreich geändert.',
        image: ''
      },
      hasBackdrop: false
    });
  }
}
