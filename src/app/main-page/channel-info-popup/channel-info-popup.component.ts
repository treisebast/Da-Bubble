import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelService } from '../../shared/services/channel.service';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { User } from '../../shared/models/user.model';
import { Subject, takeUntil } from 'rxjs';
import { ProfilComponent } from '../profil/profil.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-channel-info-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfilComponent],
  templateUrl: './channel-info-popup.component.html',
  styleUrls: ['./channel-info-popup.component.scss'],
})
export class ChannelInfoPopupComponent {
  @Input() channel: Channel | null = null;
  @Output() close = new EventEmitter<void>();

  isEditingName = false;
  isEditingDescription = false;
  editedName: string = '';
  editedDescription: string = '';
  createdByName: string = '';
  nameErrorMessage: string = '';
  usersOfSelectedChannel: User[] = [];
  selectedUser: User | null = null;
  currentUserId: string = '';
  showChannelPopup: boolean = true;
  private destroy$ = new Subject<void>();

  constructor(
    private channelService: ChannelService,
    private userService: UserService,
    private elementRef: ElementRef,
    private chatService: ChatService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  //---------------------------------------- Lifecycle Hooks ----------------------------------------

  /**
   * Initializes the component after data-bound properties are set.
   */
  ngOnInit(): void {
    if (this.channel) {
      this.initializeEditedFields();
      this.loadCreatedByUser();
      this.loadCurrentUser();
      this.loadChannelMembers();
    }
  }

  /**
   * Cleans up subscriptions to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  //---------------------------------------- Initialization Methods ----------------------------------------

  /**
   * Initializes the editable fields with the channel's current name and description.
   */
  private initializeEditedFields(): void {
    this.editedName = this.channel!.name ?? '';
    this.editedDescription = this.channel!.description ?? '';
  }

  /**
   * Loads the user who created the channel.
   */
  private loadCreatedByUser(): void {
    if (this.channel?.createdBy) {
      this.userService
        .getUser(this.channel.createdBy)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            this.createdByName = user.name;
          },
          error: () => {
            this.createdByName = 'Unknown';
          },
        });
    }
  }

  /**
   * Loads the currently authenticated user's ID.
   */
  private loadCurrentUser(): void {
    this.authService
      .getUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            this.currentUserId = user.uid;
          }
        },
        error: () => {
          console.error('Error loading current user.');
        },
      });
  }

  /**
   * Loads the members of the selected channel and removes any invalid users.
   */
  private loadChannelMembers(): void {
    if (this.channel?.members?.length) {
      // Filter out null or empty member IDs
      const validMemberIds = this.channel.members.filter(
        (id) => id != null && id !== ''
      );

      this.userService
        .getUsersByIds(validMemberIds)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (users) => {
            // Filter out undefined or null users
            const validUsers = users.filter((user) => user != null) as User[];
            this.usersOfSelectedChannel = validUsers;
          },
          error: () => {
            console.error('Error loading channel membesrs.');
          },
        });
    }
  }



  //---------------------------------------- Editing Methods ----------------------------------------

  /**
   * Enables editing mode for the channel name.
   */
  startEditingName(): void {
    this.isEditingName = true;
  }

  /**
   * Enables editing mode for the channel description.
   */
  startEditingDescription(): void {
    this.isEditingDescription = true;
  }

  /**
   * Saves the edited channel name after checking for duplicates.
   */
  async saveName(): Promise<void> {
    if (!this.channel) {
      this.isEditingName = false;
      return;
    }

    if (this.editedName === this.channel.name) {
      this.isEditingName = false;
      return;
    }

    try {
      const isDuplicate = await this.isDuplicateChannelName(this.editedName);
      if (isDuplicate) {
        this.nameErrorMessage = 'Ein Kanal mit diesem Namen existiert bereits.';
        return;
      }

      await this.updateChannelName();
    } catch (error) {
      this.nameErrorMessage = 'Fehler beim Speichern des Namens. Bitte versuche es erneut.';
    }
  }

  /**
   * Checks if the channel name is already in use.
   * @param name - The channel name to check.
   * @returns `true` if duplicate, otherwise `false`.
   */
  private async isDuplicateChannelName(name: string): Promise<boolean> {
    const duplicateChannel = await this.channelService.getChannelByName(
      name,
      this.channel!.isPrivate
    );
    return !!duplicateChannel && duplicateChannel.id !== this.channel!.id;
  }

  /**
   * Updates the channel's name.
   */
  private async updateChannelName(): Promise<void> {
    const updatedFields = { name: this.editedName };
    await this.channelService.updateChannel(this.channel!, updatedFields);
    this.channel!.name = this.editedName;
    this.isEditingName = false;
    this.nameErrorMessage = '';
  }

  /**
   * Saves the edited channel description.
   */
  async saveDescription(): Promise<void> {
    if (this.channel && this.editedDescription !== this.channel.description) {
      const updatedFields = { description: this.editedDescription };
      await this.channelService.updateChannel(this.channel, updatedFields);
      this.channel.description = this.editedDescription;
    }
    this.isEditingDescription = false;
  }

  //---------------------------------------- Channel Member Methods ----------------------------------------

  /**
   * Allows the current user to leave the channel.
   */
  async leaveChannel(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();

    if (this.channel && currentUser) {
      try {
        await this.channelService.removeUserFromChannel(
          this.channel.id,
          currentUser.uid,
          this.channel.isPrivate
        );
        this.chatService.setCurrentChat(null, false);
        this.close.emit();
      } catch (error) {
      }
    }
  }

  //---------------------------------------- Event Handlers ----------------------------------------

  /**
   * Opens the profile view for a selected user.
   * @param user - The user to view.
   */
  openProfile(user: User): void {
    this.selectedUser = user;
    this.showChannelPopup = false;
  }

  /**
   * Closes the profile card view.
   */
  closeProfileCard(): void {
    this.selectedUser = null;
    this.showChannelPopup = true;
  }

  /**
   * Closes the channel info popup.
   * @param event - The event that triggered the closure.
   */
  closePopup(event: Event): void {
    event.stopPropagation();
    this.close.emit();
  }

  /**
   * Closes the popup when clicking outside.
   * @param event - The click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closePopup(event);
    }
  }

  //---------------------------------------- Utility Methods ----------------------------------------

  /**
   * Tracks users by their unique ID.
   * @param index - The index of the user in the list.
   * @param user - The user object.
   * @returns The unique identifier for the user.
   */
  trackByUserId(index: number, user: User): string {
    return user.userId ? user.userId : index.toString();
  }

  /**
   * Checks if the edited name is valid.
   * @returns True if valid, false otherwise.
   */
  isNameValid(): boolean {
    return this.editedName.trim().length > 0 && this.editedName.length <= 17;
  }
}
