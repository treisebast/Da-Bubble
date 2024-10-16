import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnDestroy, OnInit } from '@angular/core';
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
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';
import { Subject, takeUntil } from 'rxjs';

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
export class DialogShowMembersComponent implements OnInit, OnDestroy {
  isTesting = false; // Set this to true when testing without Firebase

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
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<DialogShowMembersComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      members: User[];
      channel: Channel;
      popupState: 'listView' | 'addUsers';
    },
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog
  ) {
    console.log('Dialog data:', data);
    this.dialogProgressState = data.popupState;
  }

  ngOnInit(): void {
    this.subscribeToDialogEvents();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openProfile(user: User): void {
    this.dialogRef.close(user);
  }

  /**
   * Subscribe to dialog events
   */
  private subscribeToDialogEvents() {
    this.dialogRef
      .afterOpened()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isDialogOpen = true;
      });

    this.dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
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

    if (this.isTesting) {
      console.log('Adding users...', 'users:', usersToAdd, 'channel:', channel);
      this.loading = false;
      this.dialogRef.close();
      this.showConfirmationDialog(
        'Testingmode: Users successfully added to the channel.'
      );
      return;
    }

    try {
      const updatedMembers = [...new Set([...channel.members, ...usersToAdd])];
      channel.members = updatedMembers; // Update the local channel object
      console.log('Adding users...', 'users:', usersToAdd, 'channel:', channel);
      await this.channelService.updateChannel(channel, {
        members: updatedMembers,
      });
    } catch (error) {
      console.error('Error adding users to channel:', error);
    } finally {
      this.loading = false;
      this.dialogRef.close(); // Close the dialog after adding users
      this.showConfirmationDialog('Users successfully added to the channel.');
    }
  }

  /**
   * Close the dialog
   */
  closeDialog() {
    this.dialogRef.close();
  }

  /**
   * Shows a confirmation dialog with the given message.
   * @private
   * @param {string} message - The message to display in the confirmation dialog.
   */
  private showConfirmationDialog(message: string): void {
    this.dialog.open(ConfirmationDialogComponent, {
      data: { message: message },
      hasBackdrop: false,
    });
  }
}
