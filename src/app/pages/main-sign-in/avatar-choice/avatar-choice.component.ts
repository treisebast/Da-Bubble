import { ChangeDetectionStrategy, Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { UserService } from '../../../shared/services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-choice',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterOutlet, RouterModule],
  templateUrl: './avatar-choice.component.html',
  styleUrls: ['./avatar-choice.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarChoiceComponent {
  selectedAvatar: string = '/assets/img/front-page/avatar.svg';
  @ViewChild('uploadedImage', { static: false }) uploadedImage!: ElementRef<HTMLImageElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  fileError: string = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.type;
      const validImageTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];

      if (!validImageTypes.includes(fileType)) {
        this.fileError = 'Bitte nur JPG, PNG oder SVG Dateien hochladen.';
        return;
      } else {
        this.fileError = '';
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedAvatar = e.target.result;
        if (this.uploadedImage && this.uploadedImage.nativeElement) {
          this.uploadedImage.nativeElement.src = e.target.result;
          this.cdr.detectChanges();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  logSelectedAvatar() {
    console.log('Selected Avatar:', this.selectedAvatar);
  }
}
