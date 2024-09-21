import { CommonModule, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Channel } from '../../shared/models/channel.model';
import { ChannelService } from '../../shared/services/channel.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import {MatChipEditedEvent, MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {LiveAnnouncer} from '@angular/cdk/a11y';

@Component({
  selector: 'app-dialog-add-channel',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatProgressBarModule,
    CommonModule,
    MatDialogModule,
    MatCheckboxModule,
    MatRadioModule,
    JsonPipe,
    MatCardModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './dialog-add-channel.component.html',
  styleUrls: ['./dialog-add-channel.component.scss'],
})
export class DialogAddChannelComponent {
  isTesting = true; // Set this to true when testing without Firebase
  loading = false;
  channelName = '';
  description = '';
  isDialogOpen = false;
  currentUserId = '';

  dialogProgressState: 'addChannel' | 'addUsers' = 'addChannel';
  loadedUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchInput: string = '';
  selectedRadio: string = 'allFromChannel';
  announcer = inject(LiveAnnouncer);
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  channel: Channel = {
    id: '',
    name: '',
    description: '',
    createdBy: '',
    createdAt: new Date(),
    members: [],
    updatedAt: new Date(),
    isPrivate: false,
  };

  constructor(
    public dialogRef: MatDialogRef<DialogAddChannelComponent>,
    private channelService: ChannelService,
    private authService: AuthService,
    private dialog: MatDialog,
    private userService: UserService
  ) {
    this.initialize();
  }

  /**
   * Initialize the component
   */
  private initialize() {
    this.subscribeToDialogEvents();
    this.setCurrentUser();
    this.loadUsers();
    this.dialogProgressState = 'addChannel';
  }

  trackByUserId(index: number, user: User): string {
    return user.userId;
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

  /**
   * Set the current user
   */
  private setCurrentUser() {
    this.authService.getUser().subscribe((firebaseUser) => {
      if (firebaseUser) {
        this.currentUserId = firebaseUser.uid;
      }
    });
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
   * Set the selected radio option and reapply the user filter if needed
   * @param option - The selected option
   */
  selectOption(option: string): void {
    this.selectedRadio = option;
    this.filterUsers();
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
      channel.members = updatedMembers; // Update the local channel object

      if (!this.isTesting) {
        // Only update Firebase if not in testing mode
        await this.channelService.updateChannel(channel, {
          members: updatedMembers,
        });
        console.log('Users added to channel in Firebase:', channel);
      } else {
        console.log('Testing mode: Users added to channel locally', channel);
      }
    } catch (error) {
      console.error('Error adding users to channel:', error);
    } finally {
      this.loading = false;
      this.closeDialog(); // Close the dialog after adding users
    }
  }

  /**
   * Creates a new channel and navigates to the add users page.
   */
  async createChannelAndGoToAddUsers() {
    const newChannel: Channel = this.createChannelObject();
    try {
      await this.saveChannelToFirebase(newChannel);
      this.dialogProgressState = 'addUsers';
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  }

  /**
   * Saves a channel to Firebase or locally if testing.
   * @param newChannel - The new channel to be saved.
   */
  async saveChannelToFirebase(newChannel: Channel) {
    if (this.isTesting) {
      this.channel = newChannel;
      console.log('Testing mode: Channel created locally', newChannel);
      return;
    }

    this.loading = true;

    try {
      const channelDocRef = await this.channelService.addChannel(newChannel);
      newChannel.id = channelDocRef.id;
      this.channel = newChannel;
      console.log('Channel added to Firebase:', newChannel);
    } catch (error) {
      console.error('Error adding channel:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Create a Channel object
   * @returns Channel
   */
  private createChannelObject(): Channel {
    return {
      id: '',
      name: this.channelName,
      description: this.description,
      createdBy: this.currentUserId,
      createdAt: new Date(),
      members: [this.currentUserId],
      updatedAt: new Date(),
      isPrivate: false,
    };
  }

  /**
   * Close the dialog
   */
  closeDialog() {
    this.dialogRef.close();
  }
}
