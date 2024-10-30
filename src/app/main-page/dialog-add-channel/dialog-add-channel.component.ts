import { CommonModule, JsonPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Channel, NewChannel } from '../../shared/models/channel.model';
import { ChannelService } from '../../shared/services/channel.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dialog-add-channel',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatProgressBarModule, CommonModule, MatDialogModule, MatCheckboxModule, MatRadioModule, JsonPipe, MatCardModule, MatChipsModule, MatIconModule],
  templateUrl: './dialog-add-channel.component.html',
  styleUrls: ['./dialog-add-channel.component.scss'],
})
export class DialogAddChannelComponent implements OnInit, OnDestroy {
  loading = false;
  channelName = '';
  description = '';
  isDialogOpen = false;
  currentUserId = '';
  channelMembers: Set<string> = new Set();
  errorMessage: string = '';
  dialogProgressState: 'addChannel' | 'addUsers' = 'addChannel';
  loadedUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchInput: string = '';
  selectedRadio: string = 'allFromChannel';
  announcer = inject(LiveAnnouncer);
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  destroy$ = new Subject<void>();

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

  //---------------------------------------- Lifecycle Hooks ----------------------------------------

  constructor(
    public dialogRef: MatDialogRef<DialogAddChannelComponent>,
    private channelService: ChannelService,
    private authService: AuthService,
    private dialog: MatDialog,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.initialize();
  }

  ngOnDestroy(): void {
    this.announcer.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }

  //---------------------------------------- Initialization ----------------------------------------

  /**
   * Initializes the component.
   */
  private initialize() {
    this.subscribeToDialogEvents();
    this.setCurrentUser();
    this.loadUsers();
    this.dialogProgressState = 'addChannel';
  }

  /**
   * Subscribes to dialog events to manage the dialog state.
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

  /**
   * Sets the current user's ID from the AuthService.
   */
  private setCurrentUser() {
    this.authService
      .getUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe((firebaseUser) => {
        if (firebaseUser) {
          this.currentUserId = firebaseUser.uid;
        }
      });
  }

  /**
   * Loads users from the UserService.
   */
  private loadUsers(): void {
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((users) => {
        this.loadedUsers = users;
      });
  }

  //---------------------------------------- User Selection ----------------------------------------

  /**
   * Filters the list of users based on the search input and sorts them.
   */
  filterUsers(): void {
    const searchTerm = this.searchInput.trim().toLowerCase();

    const filtered = searchTerm ? this.loadedUsers.filter((user) =>
      user.name.toLowerCase().includes(searchTerm)
    ) : this.loadedUsers.slice();

    this.filteredUsers = this.sortUsers(filtered);
  }

  /**
   * Sorts users by membership status and name.
   * @param users - The list of users to sort.
   * @returns The sorted list of users.
   */
  private sortUsers(users: User[]): User[] {
    return users.sort((a, b) => {
      const aIsMember = this.isAlreadyMember(a) ? 1 : 0;
      const bIsMember = this.isAlreadyMember(b) ? 1 : 0;

      if (aIsMember !== bIsMember) {
        return aIsMember - bIsMember;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Sets the selected radio option and filters users accordingly.
   * @param option - The selected option.
   */
  selectOption(option: string): void {
    this.selectedRadio = option;
    this.filterUsers();
  }

  /**
   * Toggles the selection of a user.
   * @param user - The user to select or deselect.
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

  /**
   * Removes a user from the selection.
   * @param user - The user to remove.
   */
  remove(user: User): void {
    const index = this.selectedUsers.indexOf(user);

    if (index >= 0) {
      this.selectedUsers.splice(index, 1);
      this.announcer.announce(`Removed ${user.name} from selection`);
    }
  }

  /**
   * Checks if a user is selected.
   * @param user - The user to check.
   */
  isSelected(user: User): boolean {
    return this.selectedUsers.some((u) => u.userId === user.userId);
  }

  /**
   * Checks if a user is already a member of the channel.
   * @param user - The user to check.
   */
  isAlreadyMember(user: User): boolean {
    return this.channelMembers.has(user.userId);
  }

  //---------------------------------------- Channel Creation ----------------------------------------

  /**
   * Creates a new channel and navigates to the add users page.
   */
  async createChannelAndGoToAddUsers() {
    this.errorMessage = '';
    try {
      const duplicateChannel = await this.channelService.getChannelByName(
        this.channelName,
        false
      );

      if (duplicateChannel) {
        this.errorMessage = 'Ein Channel mit diesem Namen existiert bereits.';
        return;
      }

      const newChannel: NewChannel = this.createChannelObject();
      await this.saveChannelToFirebase(newChannel);
      this.dialogProgressState = 'addUsers';
    } catch (error) {
      this.errorMessage = 'Fehler beim Erstellen des Channels.';
    }
  }

  /**
   * Handler called when the channel name input changes.
   */
  onChannelNameChange() {
    this.errorMessage = '';
  }


  /**
   * Creates a channel object.
   * @returns The new channel object.
   */
  private createChannelObject(): NewChannel {
    return {
      name: this.channelName,
      description: this.description,
      createdBy: this.currentUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [this.currentUserId],
      isPrivate: false,
    };
  }

  /**
   * Saves a channel to Firebase.
   * @param newChannel - The new channel to be saved.
   */
  private async saveChannelToFirebase(newChannel: NewChannel) {
    this.loading = true;
    try {
      const channelDocRef = await this.channelService.addChannel(newChannel);
      const createdChannel: Channel = { ...newChannel, id: channelDocRef.id };
      this.channel = createdChannel;
      // Update channel members
      this.channelMembers = new Set(createdChannel.members);
    } finally {
      this.loading = false;
    }
  }

  //---------------------------------------- Add Users to Channel ----------------------------------------

  /**
   * Adds users to a channel based on the selected option.
   * @param channel - The target channel.
   * @param selectedRadio - The selected option ('allFromChannel' or specific users).
   */
  async addUsersToChannel(
    channel: Channel,
    selectedRadio: string
  ): Promise<void> {
    this.loading = true;

    const usersToAddIds = this.getUsersToAdd(selectedRadio);

    try {
      const updatedMembers = [
        ...new Set([...channel.members, ...usersToAddIds]),
      ];
      channel.members = updatedMembers;
      await this.channelService.updateChannel(channel, {
        members: updatedMembers,
      });
    } finally {
      this.loading = false;
      this.closeDialog();
    }
  }

  /**
   * Retrieves the list of user IDs to add to the channel.
   * @param selectedRadio - The selected option.
   * @returns An array of user IDs.
   */
  private getUsersToAdd(selectedRadio: string): string[] {
    return (
      selectedRadio === 'allFromChannel' ? this.loadedUsers : this.selectedUsers
    )
      .filter((user) => !this.isAlreadyMember(user))
      .map((user) => user.userId);
  }

  //---------------------------------------- Utility Methods ----------------------------------------

  /**
   * TrackBy function for ngFor loops.
   * @param index - The index of the item.
   * @param user - The user object.
   * @returns The unique user ID.
   */
  trackByUserId(index: number, user: User): string {
    return user.userId;
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
