import { ChangeDetectionStrategy, Component, ViewChild, ElementRef, ChangeDetectorRef, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { User } from '../../shared/models/user.model';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { sendEmailVerification } from '@angular/fire/auth';

@Component({
  selector: 'app-avatar-choice',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterOutlet, RouterModule],
  templateUrl: './avatar-choice.component.html',
  styleUrls: ['./avatar-choice.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarChoiceComponent implements OnInit {
  selectedAvatar: string = '';
  avatars: string[] = [];
  userName: string = 'Max Mustermann';
  @ViewChild('uploadedImage', { static: false })
  uploadedImage!: ElementRef<HTMLImageElement>;
  @ViewChild('fileInput', { static: false })
  fileInput!: ElementRef<HTMLInputElement>;
  fileError: string = '';

  @Input() ownUser!: Partial<User>;
  @Input() isChangingAvatar: boolean = false;
  @Output() setSelectedAvatar = new EventEmitter<boolean>();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private storageService: FirebaseStorageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    /**
     * Initializes the component and sets the userName if available in the navigation state.
     * @private
     */
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras.state) {
      this.userName = navigation.extras.state['userName'] || this.userName;
    }
  }

  /**
   * Lifecycle hook that is called after Angular has initialized all data-bound properties.
   * It calls the method to load avatars.
   */
  ngOnInit() {
    this.loadAvatars();
  }

  /**
   * Loads the avatar images from specified paths and sets the first one as the selected avatar.
   * Updates the component's state after loading avatars.
   * @async
   */
  async loadAvatars() {
    const avatarPaths = [
      'avatars/1.svg',
      'avatars/2.svg',
      'avatars/3.svg',
      'avatars/4.svg',
      'avatars/5.svg',
      'avatars/6.svg',
    ];
    this.avatars = await Promise.all(
      avatarPaths.map((path) =>
        firstValueFrom(this.storageService.getFileUrl(path))
      )
    );
    this.selectedAvatar = this.ownUser?.avatar || this.avatars[0];
    this.cdr.detectChanges();
  }

  /**
   * Selects an avatar and updates the component's state.
   * If a file input is present, it resets the input value.
   * @param {string} avatar - The URL of the selected avatar.
   */
  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
    this.fileError = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.cdr.detectChanges();
  }

  /**
   * Handles the file selection event. Validates the file type and reads the file if valid.
   * @param {Event} event - The file selection event.
   */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!this.isValidImageType(file.type)) {
        this.fileError = 'Bitte nur JPG, PNG oder SVG Dateien hochladen.';
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        this.fileError = 'Die Datei darf maximal 4MB groß sein.';
        return;
      }
      this.fileError = '';
      this.readFile(file);
    }
  }

  /**
   * Checks if the given file type is a valid image type.
   * @param {string} fileType - The MIME type of the file.
   * @returns {boolean} True if the file type is valid, false otherwise.
   */
  isValidImageType(fileType: string): boolean {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    return validImageTypes.includes(fileType);
  }

  /**
   * Reads the selected file and updates the selected avatar with the file's data URL.
   * @param {File} file - The selected file.
   */
  readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.updateSelectedAvatar(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Updates the selected avatar URL and updates the component's state.
   * If an uploaded image element is present, it sets its source to the new avatar URL.
   * @param {string} avatarUrl - The URL of the new avatar.
   */
  updateSelectedAvatar(avatarUrl: string) {
    this.selectedAvatar = avatarUrl;
    if (this.uploadedImage && this.uploadedImage.nativeElement) {
      this.uploadedImage.nativeElement.src = avatarUrl;
      this.cdr.detectChanges();
    }
  }

  /**
   * Logs the selected avatar to the console, retrieves the current user,
   * and updates the user's avatar URL in the database.
   * Navigates to the main page after updating.
   * @async
   */
  async logSelectedAvatar(): Promise<void> {
    const currentUser = await this.getCurrentUser();
    if (currentUser) {
      const avatarUrl = await this.getAvatarUrl(currentUser.uid);
      await this.updateUserAvatar(currentUser.uid, avatarUrl);
      this.showConfirmationDialog();
      if (!currentUser.emailVerified && !this.isChangingAvatar) {
        await sendEmailVerification(currentUser);
      }

      if (!this.isChangingAvatar) {
        this.router.navigate(['/main-page']);
      } else {
        this.setSelectedAvatar.emit(false);
      }
    }
  }

  /**
   * Displays a confirmation dialog indicating that the avatar has been selected.
   */
  showConfirmationDialog() {
    this.dialog.closeAll();
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { message: 'Avatar ausgewählt' },
      hasBackdrop: false,
    });
    setTimeout(() => dialogRef.close(), 2000);
  }

  /**
   * Retrieves the currently authenticated user.
   * @returns {Promise<any>} The current user.
   * @async
   */
  async getCurrentUser() {
    return await firstValueFrom(this.authService.getUser());
  }

  /**
   * Gets the avatar URL for the specified user ID.
   * If a file is selected in the file input, it uploads the file and returns its URL.
   * Otherwise, it returns the currently selected avatar URL.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<string>} The avatar URL.
   * @async
   */
  async getAvatarUrl(userId: string): Promise<string> {
    const fileInputElement = this.fileInput.nativeElement;
    if (fileInputElement.files && fileInputElement.files[0]) {
      const file = fileInputElement.files[0];
      return await firstValueFrom(
        this.storageService.uploadFile(file, `avatars/${userId}`)
      );
    }
    return this.selectedAvatar;
  }

  /**
   * Updates the user's avatar URL in the database.
   * Logs success or error messages based on the update result.
   * @param {string} userId - The ID of the user.
   * @param {string} avatarUrl - The new avatar URL.
   * @async
   */
  async updateUserAvatar(userId: string, avatarUrl: string) {
    const updatedUser: Partial<User> = { avatar: avatarUrl };
    const userDoc = await firstValueFrom(this.userService.getUser(userId));
    if (userDoc) {
      await this.userService.updateUser({ ...updatedUser, userId } as User);
    } else {
    }
  }

  /**
   * Determines if the continue button should be enabled.
   * @returns {boolean} True if the button should be enabled, false otherwise.
   */
  isContinueButtonDisabled(): boolean {
    return this.fileError !== '';
  }
}
