import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterModule, CommonModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})

export class SignInComponent {
  signInForm: FormGroup;
  formSubmitted = false;
  signInError: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get email() {
    return this.signInForm.get('email')!;
  }

  get password() {
    return this.signInForm.get('password')!;
  }

  onSubmit() {
    this.formSubmitted = true;
    if (this.signInForm.valid) {
      const { email, password } = this.signInForm.value;
      this.authService.signIn(email, password).subscribe({
        next: (res: any) => {
          console.log('Sign-In Successful', res);
          this.router.navigate(['/main']);
        },
        error: (err: any) => {
          console.error('Sign-In Error', err);
          if (err.code === 'auth/wrong-password') {
            this.signInError = 'Falsches Passwort.';
          } else if (err.code === 'auth/user-not-found') {
            this.signInError = 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.';
          } else {
            this.signInError = 'Fehler bei der Anmeldung.';
          }
        }
      });
    }
  }

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
}