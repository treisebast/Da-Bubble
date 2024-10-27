import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { User } from '../../shared/models/user.model';
import { EditProfilComponent } from './edit-profil/edit-profil.component';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';
import { Subscription } from 'rxjs';
import { ChatService } from '../../shared/services/chat-service.service';
import { AvatarChoiceComponent } from '../../main-sign-in/avatar-choice/avatar-choice.component';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent, MatCardModule, MatButtonModule, EditProfilComponent, AvatarChoiceComponent,],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss',
})
export class ProfilComponent implements OnInit {
  @Output() closeProfileCard = new EventEmitter();
  @Input() onclickUser: Partial<User> = {};
  onclickUserID: string = '';
  @Input() hideEditIconContainer: boolean = false;
  isChangingAvatar = false;
  isEditingEmail = false;
  isEditingName = false;
  profiltext: string = 'Profil';
  ownUser: Partial<User> = {};
  ownUserID: string = '';
  subs = new Subscription();

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private chat: ChatService
  ) { }


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Subscribes to authentication and user data, and initializes user IDs.
 */
  ngOnInit() {
    const authSub = this.auth.getUser().subscribe((firebaseUser) => {
      if (firebaseUser?.uid) {
        const userSub = this.userService
          .getUser(firebaseUser.uid)
          .subscribe((user) => {
            if (user) {
              this.ownUser = user;
              this.ownUserID = user.userId;
            }
          });
        this.subs.add(userSub);
      }
    });
    this.subs.add(authSub);
    this.onclickUserID = this.onclickUser.userId!;
  }


  /**
 * Lifecycle hook that is called when the component is destroyed.
 * Unsubscribes from all subscriptions to prevent memory leaks.
 */
  ngOnDestroy() {
    this.subs.unsubscribe();
  }


  /**
 * Emits an event to close the profile card.
 */
  closeProfil() {
    this.closeProfileCard.emit();
  }


  /**
  * Initiates the profile editing process based on the selected field.
  * @param text - The field to edit ('avatar', 'name', or 'email')
  */
  editProfil(text: string) {
    this.profiltext = 'Dein Profil bearbeiten';
    switch (text) {
      case 'avatar':
        this.isChangingAvatar = true;
        break;
      case 'name':
        this.isEditingName = true;
        break;
      case 'email':
        this.isEditingEmail = true;
        break;
    }
  }


  /**
  * Closes the edit profile dialogs and resets editing flags.
  * @param event - Boolean indicating whether to close the edit dialogs
  */
  closeEditProfil(event: boolean) {
    this.isEditingName = event;
    this.isEditingEmail = event;
    this.isChangingAvatar = event;
  }


  /**
 * Initiates a private chat with the specified user.
 * @param userId - The ID of the user to chat with
 */
  sendMessage(userId: string) {
    const userSub = this.userService.getUser(userId).subscribe((user: User) => {
      this.chat.startPrivateChat(user);
      this.closeProfil();
    });
    this.subs.add(userSub);
  }


  /**
 * Sets the selected avatar state.
 * @param event - Boolean indicating the avatar selection state
 */
  setSelectedAvatar(event: boolean) {
    this.isChangingAvatar = event.valueOf();
  }
}
