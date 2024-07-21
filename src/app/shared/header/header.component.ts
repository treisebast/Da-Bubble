import { CommonModule } from '@angular/common';
import { Component, ViewChild, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { MenuComponent } from './menu/menu.component';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    CommonModule,
    RouterModule,
    MenuComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {

  currentUser: Partial<User> = {
    name: "",
    avatar: "",
    status: ""
  };

  constructor(private auth: AuthService, private userService: UserService) {}

  ngOnInit() {
    this.auth.getUser().subscribe(firebaseUser => {
      if (firebaseUser?.uid) {
        this.userService.getUser(firebaseUser.uid).subscribe(user => {
          if (user) {
            this.currentUser = user;
          }
        });
      }
    });
  }

  @ViewChild(MenuComponent) MenuContent!: MenuComponent;

  showMenu = false;

  toggleMenu() {
    console.log(this.showMenu);
    this.showMenu = !this.showMenu;
  }
}
