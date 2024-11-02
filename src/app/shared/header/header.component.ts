import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, QueryList, ElementRef, ViewChildren, ViewChild, Output, EventEmitter, Input, HostListener } from '@angular/core';
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
  @ViewChild('searchbarDiv') searchbarDiv!: ElementRef;
  @Input() isMobileView: boolean = false;
  @Input() currentView: 'channels' | 'main' | 'secondary' = 'channels';
  @Output() mobileLogoClicked = new EventEmitter<void>();

  constructor(private auth: AuthService,
    private channelService: ChannelService,
    private userService: UserService,
    private searchService: SearchService,
    private navigationService: NavigationService,
    private router: Router
  ) { }


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Subscribes to authentication and user data, and initializes accessible chat IDs.
 */
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
    } else {
      console.error('HeaderComponent: firebaseUser ist undefined');
      this.currentUserId = '';
      this.currentUser = {};
      this.accessibleChatIds = [];
    }
  });
  this.subs.add(authSub);
}


  /**
  * Lifecycle hook that is called when the component is destroyed.
  * Unsubscribes from all subscriptions to prevent memory leaks.
  */
  ngOnDestroy() {
    this.subs.unsubscribe();
  }


  /**
 * Handles the event when the mobile logo is clicked.
 * Emits an event if in mobile view and the current view is not 'channels'.
 */
  onMobileLogoClick() {
    if (this.isMobileView && this.currentView !== 'channels') {
      this.mobileLogoClicked.emit();
    }
  }

  /**
 * Logs out the currently authenticated user.
 */
  logout() {
    this.auth.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }


  /**
 * Opens the menu by setting the `isMenuOpen` flag to true.
 */
  openMenu() {
    this.isMenuOpen = true;
  }


  /**
  * Closes the menu by setting the `isMenuOpen` flag to false.
  */
  closeMenu() {
    this.isMenuOpen = false;
  }


  /**
 * Opens the profile section for the specified user.
 * @param user - The user whose profile is to be opened
 */
  openProfil(User: Partial<User>) {
    this.isProfilOpen = true;
  }


  /**
  * Closes the profile section by setting the `isProfilOpen` flag to false.
  */
  closeProfil() {
    this.isProfilOpen = false;
  }


  /**
 * Handles the input event for the search bar.
 * Initiates a search if the query is not empty and updates the search results.
 * @param event - The input event triggered by the user
 */
  onSearchInput(event: Event) {
    if (event.target !== this.searchInput.nativeElement) {
      return;
    }
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      this.selectedSearchResultIndex = -1;
      return;
    }
    this.subs.add(
      this.searchService.searchMessages(this.searchQuery, this.accessibleChatIds).subscribe((results) => {
        this.searchResults = results;
        this.selectedSearchResultIndex = -1;
      })
    );
  }


  /**
 * Handles document click events to manage the visibility of search results.
 * Closes the search results if the click is outside the search bar division.
 * @param event - The mouse event that occurred
 */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    if (this.searchbarDiv && !this.searchbarDiv.nativeElement.contains(targetElement)) {
      this.searchResults = [];
      this.selectedSearchResultIndex = -1;
    }
  }


  /**
 * Retrieves the name of a user based on their user ID.
 * Caches the result to optimize performance.
 * @param senderId - The ID of the user whose name is to be retrieved
 * @returns The name of the user or a placeholder if not yet loaded
 */
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


  /**
 * Navigates to the specified message within the chat.
 * @param message - The message to navigate to
 */
  async goToMessage(message: Message) {
    this.navigationService.selectMessage(message);
    this.router.navigate(['/main/chat', message.chatId, 'message', message.id]);
    this.searchResults = [];
  }


  /**
 * Determines if a chat is private based on its chat ID.
 * @param chatId - The ID of the chat to check
 * @returns A promise that resolves to `true` if the chat is private, otherwise `false`
 */
  async isChatPrivate(chatId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.channelService.getChannel(chatId, true));
      return true;
    } catch {
      return false;
    }
  }


  /**
 * Retrieves the name of a channel based on its chat ID and privacy status.
 * Caches the result to optimize performance.
 * @param chatId - The ID of the chat whose name is to be retrieved
 * @param isPrivate - Flag indicating if the chat is private
 * @returns The name of the channel or a placeholder if not yet loaded
 */
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


  /**
 * Handles keydown events in the search input to navigate through search results.
 * @param event - The keyboard event that occurred
 */
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


  /**
 * Checks if there are any search results available.
 * @returns `true` if search results exist, otherwise `false`
 */
  private hasSearchResults(): boolean {
    return this.searchResults && this.searchResults.length > 0;
  }


  /**
 * Handles the ArrowDown key event to move the selection down in search results.
 */
  private handleArrowDown() {
    this.incrementSelectedIndex();
    this.scrollToSelectedItem();
  }


  /**
 * Handles the ArrowUp key event to move the selection up in search results.
 */
  private handleArrowUp() {
    this.decrementSelectedIndex();
    this.scrollToSelectedItem();
  }


  /**
 * Handles the Enter key event to select the currently highlighted search result.
 */
  private handleEnter() {
    if (this.isSelectedIndexValid()) {
      this.goToMessage(this.searchResults[this.selectedSearchResultIndex]);
    }
  }



  /**
   * Increments the selected search result index, wrapping around if necessary.
   */
  private incrementSelectedIndex() {
    if (this.selectedSearchResultIndex < this.searchResults.length - 1) {
      this.selectedSearchResultIndex++;
    } else {
      this.selectedSearchResultIndex = 0;
    }
  }


  /**
 * Decrements the selected search result index, wrapping around if necessary.
 */
  private decrementSelectedIndex() {
    if (this.selectedSearchResultIndex > 0) {
      this.selectedSearchResultIndex--;
    } else {
      this.selectedSearchResultIndex = this.searchResults.length - 1;
    }
  }


  /**
 * Checks if the currently selected index is valid.
 * @returns `true` if the index is within the range of search results, otherwise `false`
 */
  private isSelectedIndexValid(): boolean {
    return (
      this.selectedSearchResultIndex >= 0 &&
      this.selectedSearchResultIndex < this.searchResults.length
    );
  }


  /**
 * Scrolls the view to the currently selected search result item.
 */
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


  /**
 * Retrieves the ElementRef of the currently selected search result item.
 * @returns The ElementRef of the selected search result item or `null` if not found
 */
  private getSelectedSearchResultItem(): ElementRef<HTMLLIElement> | null {
    if (this.searchResultItems && this.selectedSearchResultIndex !== -1) {
      const itemsArray = this.searchResultItems.toArray();
      return itemsArray[this.selectedSearchResultIndex] || null;
    }
    return null;
  }
}
