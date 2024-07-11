import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, MatCardModule, RouterOutlet, RouterModule, ReactiveFormsModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss'
})

export class SignUpComponent {
  signUpForm: FormGroup;
  isPrivacyPolicyAccepted: boolean = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get name() {
    return this.signUpForm.get('name')!;
  }

  get email() {
    return this.signUpForm.get('email')!;
  }

  get password() {
    return this.signUpForm.get('password')!;
  }

  onSubmit() {
    if (this.signUpForm.valid && this.isPrivacyPolicyAccepted) {
      // Handle successful form submission here
      console.log('Form Submitted', this.signUpForm.value);
      this.router.navigate(['/avatar']);
    }
  }
}