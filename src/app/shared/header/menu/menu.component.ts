import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { ChatService } from '../../services/chat-service.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle, MatButtonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  @Output() closeMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  isMenuOpen: boolean = true;

  constructor(private auth: AuthService, private chatService: ChatService, private router: Router) { }


  /**
 * Toggles the visibility of the menu and emits an event to close the menu after a delay.
 */
  close() {
    this.isMenuOpen = !this.isMenuOpen;
    setTimeout(() => this.closeMenu.emit(), 300);
  }


  /**
 * Emits an event to open the profile section.
 */
  openProfilContent() {
    this.openProfile.emit();
  }


  /**
 * Logs out the current user by closing the menu, resetting the current chat, and signing out.
 */
  logout() {
    this.close();
    this.chatService.setCurrentChat(null, false);
    this.auth.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
