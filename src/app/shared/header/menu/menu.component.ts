import { Component, EventEmitter, Output } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatButtonModule,
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  @Output() closeMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();

  constructor() {}

  close() {
    this.closeMenu.emit();
  }

  openProfilContent() {
    this.openProfile.emit();
  }

  openLogoutDialog() {
    console.log('Logout');
  }
}
