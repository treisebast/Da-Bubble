import { CommonModule, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { LiveAnnouncer } from '@angular/cdk/a11y';

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
  isTesting = false; // Set this to true when testing without Firebase
  loading = false;
  channelName = '';
  description = '';
  isDialogOpen = false;
  currentUserId = '';

  channelNameErrorMessage: string = '';
  showChannelNameErrorMessage: boolean = false;
  private channelNameErrorTimeout: any;
  channelMembers: Set<string> = new Set();

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
   * Filters the list of users based on the search input and sorts them.
   * The method trims and converts the search input to lowercase, then filters the `loadedUsers` array
   * to include only users whose names contain the search term. If the search term is empty, it returns
   * a copy of all users.
   * After filtering, the users are sorted such that members (determined by `isAlreadyMember`) appear
   * before non-members. Within each group (members and non-members), users are sorted alphabetically
   * by name.
   */
  filterUsers(): void {
    const searchTerm = this.searchInput.trim().toLowerCase();

    const filtered = searchTerm
      ? this.loadedUsers.filter((user) =>
          user.name.toLowerCase().includes(searchTerm)
        )
      : this.loadedUsers.slice(); // Kopie aller Benutzer

    this.filteredUsers = filtered.sort((a, b) => {
      const aIsMember = this.isAlreadyMember(a) ? 1 : 0;
      const bIsMember = this.isAlreadyMember(b) ? 1 : 0;

      if (aIsMember === bIsMember) {
        return a.name.localeCompare(b.name);
      } else {
        return aIsMember - bIsMember;
      }
    });
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
   * Adds users to a channel based on the selected option.
   *
   * @param {Channel} channel - The target channel.
   * @param {string} selectedRadio - The selected option ('allFromChannel' or specific users).
   * @returns {Promise<void>} - Resolves when the operation is complete.
   *
   * @remarks
   * - Filters out existing members.
   * - Updates Firebase if not in testing mode.
   * - Logs locally if in testing mode.
   */
  async addUsersToChannel(
    channel: Channel,
    selectedRadio: string
  ): Promise<void> {
    this.loading = true;

    const usersToAddIds = (
      selectedRadio === 'allFromChannel' ? this.loadedUsers : this.selectedUsers
    )
      .filter(user => !this.isAlreadyMember(user))
      .map(user => user.userId);

    try {
      const updatedMembers = [...new Set([...channel.members, ...usersToAddIds])];
      channel.members = updatedMembers;

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
      this.closeDialog();
    }
  }

  /**
   * Creates a new channel and navigates to the add users page.
   */
  async createChannelAndGoToAddUsers() {
    this.channelNameErrorMessage = '';
    this.showChannelNameErrorMessage = false;

    // Validierung des Channel-Namens
    this.validateChannelName();

    // Überprüfen, ob eine Fehlermeldung vorliegt
    if (this.channelNameErrorMessage) {
      return; // Abbrechen, wenn der Name zu lang ist
    }

    try {
      const duplicateChannel = await this.channelService.getChannelByName(
        this.channelName,
        false
      );

      if (duplicateChannel) {
        this.channelNameErrorMessage = 'Ein Channel mit diesem Namen existiert bereits.';
        this.showChannelNameErrorMessage = true;
        return;
      }

      const newChannel: NewChannel = this.createChannelObject();
      await this.saveChannelToFirebase(newChannel);
      this.dialogProgressState = 'addUsers';
    } catch (error) {
      console.error('Fehler beim Erstellen des Channels:', error);
      this.channelNameErrorMessage = 'Fehler beim Erstellen des Channels. Bitte versuchen Sie es erneut.';
      this.showChannelNameErrorMessage = true;
    }
  }

  /**
 * Validates the Channel name for max length.
 */
  validateChannelName(): void {
    if (this.channelName.length > 17) {
      this.channelNameErrorMessage = 'Der Channel-Name darf maximal 17 Zeichen lang sein.';
    } else {
      this.channelNameErrorMessage = '';
    }
  }

  /**
   * Saves a channel to Firebase or locally if testing.
   * @param newChannel - The new channel to be saved.
   */
  async saveChannelToFirebase(newChannel: NewChannel) {
    if (this.isTesting) {
      this.channel = { ...newChannel, id: '' };
      // Aktualisiere die channelMembers
      this.channelMembers = new Set(newChannel.members);
      console.log('Testing mode: Channel created locally', newChannel);
      return;
    }

    this.loading = true;

    try {
      const channelDocRef = await this.channelService.addChannel(newChannel);
      const createdChannel: Channel = { ...newChannel, id: channelDocRef.id };
      this.channel = createdChannel;
      // Aktualisiere die channelMembers
      this.channelMembers = new Set(createdChannel.members);
      console.log('Channel added to Firebase:', createdChannel);
    } catch (error) {
      console.error('Error adding channel:', error);
    } finally {
      this.loading = false;
    }
  }

  isAlreadyMember(user: User): boolean {
    return this.channelMembers.has(user.userId);
  }

  /**
   * Create a Channel object
   * @returns Channel
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
   * Close the dialog
   */
  closeDialog() {
    this.dialogRef.close();
  }
}
