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
  ],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss',
})
export class ProfilComponent implements OnInit {
  @Output() closeProfileCard = new EventEmitter();
  @Input() onclickUser: Partial<User> = {};
  onclickUserID: string = '';

  isEditing = false;
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
              console.log(this.ownUserID);
              console.log(this.onclickUserID);
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

  editProfil() {
    this.isEditing = true;
    console.log(this.onclickUser);
    this.profiltext = 'Dein Profil bearbeiten';
  }

  closeEditProfil(event: boolean) {
    this.isEditing = event;
  }

  sendMessage(userId: string) {
    const userSub = this.userService.getUser(userId).subscribe((user: User) => {
      this.chat.startPrivateChat(user);
      this.subs.add(userSub);
      this.closeProfil();
    });
  }
}
