import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogTitle,
  MatDialogContent,
} from '@angular/material/dialog';
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
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent,
    MatCardModule,
    MatButtonModule,
    EditProfilComponent,
    AvatarChoiceComponent,
  ],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss',
})
export class ProfilComponent implements OnInit {
  @Output() closeProfileCard = new EventEmitter();
  @Input() onclickUser: Partial<User> = {};
  onclickUserID: string = '';

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
  ) {}

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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  closeProfil() {
    this.closeProfileCard.emit();
  }

  editProfil(text: string) {
    this.profiltext = 'Dein Profil bearbeiten';
    console.log('editing profile...');
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

  closeEditProfil(event: boolean) {
    this.isEditingName = event;
    this.isEditingEmail = event;
    this.isChangingAvatar = event;
  }

  sendMessage(userId: string) {
    const userSub = this.userService.getUser(userId).subscribe((user: User) => {
      this.chat.startPrivateChat(user);
      this.closeProfil();
    });
    this.subs.add(userSub);
  }

  setSelectedAvatar(event: boolean) {
    this.isChangingAvatar = event.valueOf();
  }
}
