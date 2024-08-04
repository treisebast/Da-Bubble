import { Component, EventEmitter, Input, Output } from '@angular/core';
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
export class ProfilComponent {
  @Output() closeProfileCard = new EventEmitter();
  @Input() ownUser: Partial<User> = {};

  isEditing = false;
  profiltext: string = 'Profil';

  constructor() {}

  closeProfil() {
    this.closeProfileCard.emit();
  }

  editProfil() {
    this.isEditing = true;
    this.profiltext = 'Dein Profil bearbeiten';
  }

  closeEditProfil(event: boolean) {
    this.isEditing = event;
  }
}
