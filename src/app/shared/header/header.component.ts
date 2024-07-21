import { CommonModule } from '@angular/common';
import {
  Component,
  ViewChild,
  OnInit,
  OnDestroy,
  output,
  Output,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { MenuComponent } from './menu/menu.component';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';
import { Subscription } from 'rxjs';
import { ProfilComponent } from '../../main-page/profil/profil.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    CommonModule,
    RouterModule,
    MenuComponent,
    ProfilComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: Partial<User> = {
    name: '',
    avatar: '',
    status: '',
  };

  isMenuOpen = false;
  isProfilOpen = false;

  private subs = new Subscription();

  constructor(private auth: AuthService, private userService: UserService) {}

  @ViewChild(ProfilComponent) profil!: ProfilComponent;

  ngOnInit() {
    const authSub = this.auth.getUser().subscribe((firebaseUser) => {
      if (firebaseUser?.uid) {
        const userSub = this.userService
          .getUser(firebaseUser.uid)
          .subscribe((user) => {
            if (user) {
              this.currentUser = user;
            }
          });
        this.subs.add(userSub);
      }
    });
    this.subs.add(authSub);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  openMenu() {
    this.isMenuOpen = true;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  openProfil() {
    this.isProfilOpen = true;
    console.log('open profil');
  }

  closeProfil() {
    this.isProfilOpen = false;
  }
}
