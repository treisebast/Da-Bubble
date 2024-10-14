import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { MenuComponent } from './menu/menu.component';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';
import { firstValueFrom, Subscription } from 'rxjs';
import { ProfilComponent } from '../../main-page/profil/profil.component';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../services/search.service'; // Neuer Service für die Suche
import { Message } from '../models/message.model';
import { ChannelService } from '../services/channel.service';
import { NavigationService } from '../services/navigation-service.service';

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
    FormsModule
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
  searchQuery: string = '';
  searchResults: Message[] = [];
  userNamesCache: { [userId: string]: string } = {};
  private subs = new Subscription();

  constructor(private auth: AuthService,
    private channelService: ChannelService,
    private userService: UserService,
    private searchService: SearchService,
    private router: Router,
    private navigationService: NavigationService,
  ) { }

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

  logout() {
    this.auth.signOut();
  }

  openMenu() {
    this.isMenuOpen = true;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  openProfil(User: Partial<User>) {
    this.isProfilOpen = true;
    console.log(User);
  }

  closeProfil() {
    this.isProfilOpen = false;
  }

  // Suchfunktion
  onSearchInput() {
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    this.subs.add(
      this.searchService.searchMessages(this.searchQuery).subscribe((results) => {
        this.searchResults = results;
        console.log('Suchergebnisse:', results);
      })
    );
  }

  getUserName(senderId: string): string {
    if (this.userNamesCache[senderId]) {
      return this.userNamesCache[senderId];
    } else {
      this.userNamesCache[senderId] = 'Lade...';
      this.userService.getUserNameById(senderId).then((name) => {
        this.userNamesCache[senderId] = name || 'Unbekannt';
      });
      return this.userNamesCache[senderId];
    }
  }

  async goToMessage(message: Message) {
    // Verwenden des NavigationService anstelle von URL-Parametern
    this.navigationService.selectMessage(message);
    this.searchResults = [];
  }

  async isChatPrivate(chatId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.channelService.getChannel(chatId, true));
      return true;
    } catch {
      return false;
    }
  }
}
