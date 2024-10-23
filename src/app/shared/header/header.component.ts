import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, QueryList, ElementRef, ViewChildren, ViewChild, Output, EventEmitter, Input } from '@angular/core';
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
import { SearchService } from '../services/search.service';
import { Message } from '../models/message.model';
import { ChannelService } from '../services/channel.service';
import { NavigationService } from '../services/navigation-service.service';
import { Channel } from '../models/channel.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, CommonModule, RouterModule, MenuComponent, ProfilComponent, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: Partial<User> = {
    name: '',
    avatar: '',
    status: '',
  };
  currentUserId: string = '';
  isMenuOpen = false;
  isProfilOpen = false;
  searchQuery: string = '';
  searchResults: Message[] = [];
  userNamesCache: { [userId: string]: string } = {};
  channelNamesCache: { [chatId: string]: string } = {};
  selectedSearchResultIndex: number = -1;
  accessibleChatIds: string[] = [];
  
  private subs = new Subscription();
  @ViewChildren('searchResultItem') searchResultItems!: QueryList<ElementRef<HTMLLIElement>>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @Input() isMobileView: boolean = false;
  @Input() currentView: 'channels' | 'main' | 'secondary' = 'channels';
  @Output() mobileLogoClicked = new EventEmitter<void>();

  constructor(private auth: AuthService,
    private channelService: ChannelService,
    private userService: UserService,
    private searchService: SearchService,
    private navigationService: NavigationService,
  ) { }

  ngOnInit() {
    const authSub = this.auth.getUser().subscribe((firebaseUser) => {
      if (firebaseUser?.uid) {
        this.currentUserId = firebaseUser.uid;
        const userSub = this.userService.getUser(firebaseUser.uid).subscribe((user) => {
          if (user) {
            this.currentUser = user;
            const channelsSub = this.userService.getUserChannels(this.currentUserId).subscribe((channels: Channel[]) => {
              this.accessibleChatIds = channels.map(channel => channel.id);
            });
            this.subs.add(channelsSub);
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

  onMobileLogoClick() {
    if (this.isMobileView && this.currentView !== 'channels') {
      this.mobileLogoClicked.emit();
    }
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

  // Search
  onSearchInput(event: Event) {
    if (event.target !== this.searchInput.nativeElement) {
      return;
    }
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      this.selectedSearchResultIndex = -1;
      return;
    }
    // Übergeben der zugänglichen Chat-IDs an die Suche
    this.subs.add(
      this.searchService.searchMessages(this.searchQuery, this.accessibleChatIds).subscribe((results) => {
        this.searchResults = results;
        this.selectedSearchResultIndex = -1;
        console.log('Suchergebnisse:', results);
      })
    );
  }

  getUserName(senderId: string): string {
    if (this.userNamesCache[senderId]) {
      return this.userNamesCache[senderId];
    } else {
      this.userNamesCache[senderId] = 'Lade...';
      const sub = this.userService.getUser(senderId).subscribe(user => {
        this.userNamesCache[senderId] = user.name || 'Unbekannt';
      });
      this.subs.add(sub);
      return this.userNamesCache[senderId];
    }
  }

  async goToMessage(message: Message) {
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

  getChannelName(chatId: string, isPrivate: boolean): string {
    if (this.channelNamesCache[chatId]) {
      return this.channelNamesCache[chatId];
    } else {
      this.channelNamesCache[chatId] = 'Lade...';
      const sub = this.channelService.getChannel(chatId, isPrivate).subscribe(channel => {
        if (channel) {
          if (channel.name) {
            this.channelNamesCache[chatId] = channel.name;
          } else if (isPrivate && channel.members) {
            const otherUserId = channel.members.find((id: string) => id !== this.currentUserId);
            if (otherUserId) {
              this.userService.getUser(otherUserId).subscribe(user => {
                this.channelNamesCache[chatId] = user.name || 'Unbekannt';
              });
            } else {
              this.channelNamesCache[chatId] = 'Unbekannt';
            }
          } else {
            this.channelNamesCache[chatId] = 'Unbekannt';
          }
        } else {
          this.channelNamesCache[chatId] = 'Unbekannt';
        }
      });
      this.subs.add(sub);
      return this.channelNamesCache[chatId];
    }
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (this.hasSearchResults()) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.handleArrowDown();
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.handleArrowUp();
          break;
        case 'Enter':
          event.preventDefault();
          this.handleEnter();
          break;
      }
    }
  }

  private hasSearchResults(): boolean {
    return this.searchResults && this.searchResults.length > 0;
  }
  
  private handleArrowDown() {
    this.incrementSelectedIndex();
    this.scrollToSelectedItem();
  }
  
  private handleArrowUp() {
    this.decrementSelectedIndex();
    this.scrollToSelectedItem();
  }
  
  private handleEnter() {
    if (this.isSelectedIndexValid()) {
      this.goToMessage(this.searchResults[this.selectedSearchResultIndex]);
    }
  }
  
  private incrementSelectedIndex() {
    if (this.selectedSearchResultIndex < this.searchResults.length - 1) {
      this.selectedSearchResultIndex++;
    } else {
      this.selectedSearchResultIndex = 0;
    }
  }
  
  private decrementSelectedIndex() {
    if (this.selectedSearchResultIndex > 0) {
      this.selectedSearchResultIndex--;
    } else {
      this.selectedSearchResultIndex = this.searchResults.length - 1;
    }
  }
  
  private isSelectedIndexValid(): boolean {
    return (
      this.selectedSearchResultIndex >= 0 &&
      this.selectedSearchResultIndex < this.searchResults.length
    );
  }
  
  private scrollToSelectedItem() {
    setTimeout(() => {
      const selectedItem = this.getSelectedSearchResultItem();
      if (selectedItem) {
        selectedItem.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    });
  }
  
  private getSelectedSearchResultItem(): ElementRef<HTMLLIElement> | null {
    if (this.searchResultItems && this.selectedSearchResultIndex !== -1) {
      const itemsArray = this.searchResultItems.toArray();
      return itemsArray[this.selectedSearchResultIndex] || null;
    }
    return null;
  }
}
