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

  ngOnInit() {
    this.filterUsers();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['searchTerm']) {
      this.filterUsers();
    }
  }

  filterUsers() {
    if (this.searchTerm && this.searchTerm.length > 0) {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user => user.name.toLowerCase().includes(term));
    } else {
      this.filteredUsers = [...this.users];
    }
    this.selectedIndex = -1;
  }

  selectUser(user: User) {
    this.userSelected.emit(user);
  }

  moveSelectionDown() {
    if (this.selectedIndex < this.filteredUsers.length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }
    this.scrollToSelected();
  }

  moveSelectionUp() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else {
      this.selectedIndex = this.filteredUsers.length - 1;
    }
    this.scrollToSelected();
  }

  getSelectedUser(): User | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredUsers.length) {
      return this.filteredUsers[this.selectedIndex];
    }
    return null;
  }

  private scrollToSelected() {
    if (this.userItems && this.userItems.toArray()[this.selectedIndex]) {
      const element = this.userItems.toArray()[this.selectedIndex].nativeElement;
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  handleImgError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/img/profile/fallback_user.png';
  }
}
