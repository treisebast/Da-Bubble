import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, CommonModule,
    MatIconModule, MatCardModule, RouterOutlet, RouterModule, ReactiveFormsModule
  ],
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

  async onSubmit(event: Event) {
    event.preventDefault();
  
    if (this.signUpForm.valid && this.isPrivacyPolicyAccepted) {
      const { name, email, password } = this.signUpForm.value;
  
      try {
        const credential = await firstValueFrom(this.authService.signUp(email, password));
        const user = credential.user;
        console.log('New User ID:', user?.uid);
  
        if (user) {
          const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
          const photoURL = userDoc?.avatar || '';
          await firstValueFrom(this.authService.updateUserProfile(user, { displayName: name, photoURL }));
          console.log('User profile updated with display name and photoURL');
        }
  
        const userObj: User = {
          userId: user!.uid,
          name: name,
          email: email,
          avatar: '',
          status: 'online',
          lastSeen: new Date()
        };
  
        await this.userService.addUser(userObj);
        this.dialog.open(ConfirmationDialogComponent, {
          data: { message: 'Konto erfolgreich erstellt!' },
        });
        console.log('User registered and details saved');
        this.router.navigate(['/avatar']);
      } catch (error: any) {
        console.error('Error during sign up or saving user details', error);
        if (error.code === 'auth/email-already-in-use') {
          this.emailError = 'Diese E-Mail existiert bereits.';
        } else {
          this.emailError = 'Diese E-mail ist ungültig.';
        }
        this.cdr.detectChanges();
      }
    }
  }
  
  
  
}
