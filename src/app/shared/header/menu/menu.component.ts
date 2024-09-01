import { Component, EventEmitter, Output } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  @Output() closeMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  isMenuOpen: boolean = true;

  constructor(private auth: AuthService) {}

  close() {
    this.isMenuOpen = !this.isMenuOpen;
    setTimeout(() => this.closeMenu.emit(), 300);
  }

  openProfilContent() {
    this.openProfile.emit();
  }

  logout() {
    this.close();
    this.auth.signOut();
  }
}
