import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogClose,
  MatDialogActions,
  MatDialogTitle,
} from '@angular/material/dialog';
import { User } from '../../../shared/models/user.model';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { UserService } from '../../../shared/services/user.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Channel } from '../../../shared/models/channel.model';
import { ChannelService } from '../../../shared/services/channel.service';

@Component({
  selector: 'app-dialog-show-members',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogTitle,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './dialog-show-members.component.html',
  styleUrls: ['./dialog-show-members.component.scss'],
})
export class DialogShowMembersComponent implements OnInit {
  isTesting = true; // Set this to true when testing without Firebase

  loading = false;
  isDialogOpen = false;
  dialogProgressState: 'listView' | 'addUsers' = 'listView';
  loadedUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchInput: string = '';
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  announcer = inject(LiveAnnouncer);

  constructor(
    public dialogRef: MatDialogRef<DialogShowMembersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { members: User[]; channel: Channel },
    private userService: UserService,
    private channelService: ChannelService
  ) {}

  ngOnInit(): void {
    this.subscribeToDialogEvents();
    this.loadUsers();
  }

  // Close dialog and open profile popup
  openProfile(user: User): void {
    this.dialogRef.close(user);
  }

  /**
   * Subscribe to dialog events
   */
  private subscribeToDialogEvents() {
    this.dialogRef.afterOpened().subscribe(() => {
      this.isDialogOpen = true;
    });

    this.dialogRef.afterClosed().subscribe(() => {
      this.isDialogOpen = false;
    });
  }

  trackByUserId(index: number, user: User): string {
    return user.userId;
  }

  /**
   * Load users from the UserService and apply an initial filter
   */
  private loadUsers(): void {
    this.userService.getUsers().subscribe((users) => {
      this.loadedUsers = users;
    });
  }

  /**
   * Filter users based on the search input
   */
  filterUsers(): void {
    const searchTerm = this.searchInput.trim().toLowerCase();
    this.filteredUsers = searchTerm
      ? this.loadedUsers.filter((user) =>
          user.name.toLowerCase().includes(searchTerm)
        )
      : [];
  }

  /**
   * Check or uncheck users in the selection list
   * @param user - The user object that was clicked
   */
  selectUsers(user: User): void {
    const index = this.selectedUsers.findIndex((u) => u.userId === user.userId);
    if (index === -1) {
      this.selectedUsers.push(user);
      this.searchInput = '';
    } else {
      this.selectedUsers.splice(index, 1);
      this.announcer.announce(`Removed ${user.name} from selection`);
    }
  }

  remove(user: User): void {
    const index = this.selectedUsers.indexOf(user);

    if (index >= 0) {
      this.selectedUsers.splice(index, 1);
      this.announcer.announce(`Removed ${user.name} from selection`);
    }
  }

  /**
   * Check if a user is selected
   * @param user - The user to check
   * @returns boolean - Whether the user is selected or not
   */
  isSelected(user: User): boolean {
    return this.selectedUsers.some((u) => u.userId === user.userId);
  }

  /**
   * Creates a new channel and navigates to the add users page.
   */
  async goToAddUsers() {
    this.dialogProgressState = 'addUsers';
  }

  /**
   * Add users to the channel and close the dialog
   * @param channel - The channel to which users will be added
   */
  async addUsersToChannel(channel: Channel): Promise<void> {
    this.loading = true;

    const usersToAdd = this.selectedUsers.map((user) => user.userId);

    console.log('Adding users to channel', usersToAdd);
    this.loading = false;
  }

  /**
   * Close the dialog
   */
  closeDialog() {
    this.dialogRef.close();
  }
}
