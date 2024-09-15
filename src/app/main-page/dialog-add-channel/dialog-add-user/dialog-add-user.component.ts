import { CommonModule, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Inject,
} from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { Channel } from '../../../shared/models/channel.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/user.model';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ChannelService } from '../../../shared/services/channel.service';

@Component({
  selector: 'app-dialog-add-user',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialogModule,
    FormsModule,
    MatProgressBarModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    JsonPipe,
  ],
  templateUrl: './dialog-add-user.component.html',
  styleUrl: './dialog-add-user.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogAddUserComponent {
  private readonly _formBuilder = inject(FormBuilder);

  selectedUsersForm: FormGroup = this._formBuilder.group({
    selectedUsers: [],
  });

  isDialogOpen = false;
  channel: Channel;
  loading = false;
  selectedRadio: string = 'allFromChannel';
  loadedUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchInput: string = '';

  constructor(
    private dialogRef: MatDialogRef<DialogAddUserComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { channel: Channel },
    private userService: UserService,
    private channelService: ChannelService
  ) {
    this.channel = data.channel;
    this.initialize();
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
   * Set the selected radio option and reapply the user filter if needed
   * @param option - The selected option
   */
  selectOption(option: string): void {
    this.selectedRadio = option;
    this.filterUsers();
  }

  /**
   * Add users to the channel and close the dialog
   * @param channel - The channel to which users will be added
   */
  async addUsersToChannel(
    channel: Channel,
    selectedRadio: string
  ): Promise<void> {
    this.loading = true;

    const usersToAdd = (
      selectedRadio === 'allFromChannel' ? this.loadedUsers : this.selectedUsers
    ).map((user) => user.userId);

    try {
      const updatedMembers = [...new Set([...channel.members, ...usersToAdd])];
      await this.channelService.updateChannel(channel, {
        members: updatedMembers,
      });
    } catch (error) {
      console.error('Error adding users to channel:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Close the dialog
   */
  closeDialog(): void {
    this.dialogRef.close();
  }

  /**
   * Check or uncheck users in the selection list
   * @param user - The user object that was clicked
   */
  selectUsers(user: User): void {
    const index = this.selectedUsers.findIndex((u) => u.userId === user.userId);
    if (index === -1) {
      this.selectedUsers.push(user);
      console.log('user added to selectedUsers:', this.selectedUsers);
    } else {
      this.selectedUsers.splice(index, 1);
      console.log('user removed from selectedUsers:', this.selectedUsers);
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

  // -----------------------------------------------------
  // -------------------Private Methods-------------------
  // -----------------------------------------------------

  private initialize(): void {
    this.subscribeToDialogEvents();
    this.loadUsers();
  }

  /**
   * Load users from the UserService and apply an initial filter
   */
  private loadUsers(): void {
    this.userService.getUsers().subscribe((users) => {
      this.loadedUsers = users;
      this.filterUsers();
    });
  }

  /**
   * Subscribe to dialog open and close events
   */
  private subscribeToDialogEvents(): void {
    this.dialogRef.afterOpened().subscribe(() => {
      this.isDialogOpen = true;
    });

    this.dialogRef.afterClosed().subscribe(() => {
      this.isDialogOpen = false;
    });
  }
}
