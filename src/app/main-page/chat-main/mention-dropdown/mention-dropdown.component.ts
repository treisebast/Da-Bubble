import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { User } from '../../../shared/models/user.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mention-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mention-dropdown.component.html',
  styleUrls: ['./mention-dropdown.component.scss']
})
export class MentionDropdownComponent implements OnInit, OnChanges {
  @Input() users: User[] = [];
  @Input() searchTerm: string = '';
  @Output() userSelected = new EventEmitter<User>();
  @ViewChildren('userItem') userItems!: QueryList<ElementRef>;

  filteredUsers: User[] = [];
  selectedIndex: number = -1;


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Initializes the filtering of users.
 */
  ngOnInit() {
    this.filterUsers();
  }


  /**
 * Lifecycle hook that is called when any data-bound property changes.
 * @param changes - Object of changed properties
 */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['searchTerm']) {
      this.filterUsers();
    }
  }


  /**
 * Filters the users based on the current search term.
 * If no search term is provided, all users are displayed.
 */
  filterUsers() {
    if (this.searchTerm && this.searchTerm.length > 0) {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user => user.name.toLowerCase().includes(term));
    } else {
      this.filteredUsers = [...this.users];
    }
    this.selectedIndex = -1;
  }


  /**
   * Emits the selected user through the `userSelected` event.
   * @param user - The user that was selected
   */
  selectUser(user: User) {
    this.userSelected.emit(user);
  }


  /**
   * Moves the selection down to the next user in the list.
   * If the end of the list is reached, wraps around to the first user.
   */
  moveSelectionDown() {
    if (this.selectedIndex < this.filteredUsers.length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }
    this.scrollToSelected();
  }


  /**
   * Moves the selection up to the previous user in the list.
   * If the beginning of the list is reached, wraps around to the last user.
   */
  moveSelectionUp() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else {
      this.selectedIndex = this.filteredUsers.length - 1;
    }
    this.scrollToSelected();
  }


  /**
   * Retrieves the currently selected user.
   * @returns The selected user or `null` if no user is selected
   */
  getSelectedUser(): User | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredUsers.length) {
      return this.filteredUsers[this.selectedIndex];
    }
    return null;
  }


  /**
   * Scrolls the view to ensure the selected user is visible.
   * This method is private and used internally within the component.
   */
  private scrollToSelected() {
    if (this.userItems && this.userItems.toArray()[this.selectedIndex]) {
      const element = this.userItems.toArray()[this.selectedIndex].nativeElement;
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }


  /**
   * Handles image loading errors by setting a fallback image source.
   * @param event - The event triggered by the image error
   */
  handleImgError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/img/profile/fallback_user.png';
  }
}
