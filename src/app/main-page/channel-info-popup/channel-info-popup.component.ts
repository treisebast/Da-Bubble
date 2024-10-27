import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelService } from '../../shared/services/channel.service';
import { Channel } from '../../shared/models/channel.model';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { User } from '../../shared/models/user.model';
import { Subscription } from 'rxjs';
import { ProfilComponent } from '../profil/profil.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-channel-info-popup',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfilComponent],
  templateUrl: './channel-info-popup.component.html',
  styleUrls: ['./channel-info-popup.component.scss']
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
  private userSubscription: Subscription | null = null;

  constructor(private channelService: ChannelService,
    private userService: UserService,
    private elementRef: ElementRef,
    private chatService: ChatService,
    private authService: AuthService,
    private dialog: MatDialog) { }

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   * Initializes edited fields and loads necessary user and channel data.
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
   * Lifecycle hook that is called when the component is destroyed.
   * Cleans up subscriptions to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.unsubscribeFromUser();
  }


  /**
   * Initializes the editable fields with the channel's current name and description.
   */
  private initializeEditedFields(): void {
    this.editedName = this.channel!.name ?? '';
    this.editedDescription = this.channel!.description ?? '';
  }



  /**
    * Loads the user who created the channel and sets the `createdByName`.
    */
  private loadCreatedByUser(): void {
    if (this.channel!.createdBy) {
      this.userService.getUser(this.channel!.createdBy).subscribe({
        next: (user) => {
          this.createdByName = user.name;
        },
        error: () => {
          this.createdByName = 'Unknown';
        }
      });
    }
  }


  /**
   * Loads the currently authenticated user's ID.
   */
  private loadCurrentUser(): void {
    this.authService.getUser().subscribe({
      next: (user) => {
        if (user) {
          this.currentUserId = user.uid;
        }
      },
      error: () => {
        // Handle error silently or implement alternative logic
      }
    });
  }


  /**
   * Loads the members of the selected channel.
   */
  private loadChannelMembers(): void {
    if (this.channel!.members && this.channel!.members.length > 0) {
      this.userSubscription = this.userService.getUsersByIds(this.channel!.members).subscribe({
        next: (users) => {
          this.usersOfSelectedChannel = users;
        },
        error: () => {
        }
      });
    }
  }


  /**
    * Unsubscribes from the user subscription to prevent memory leaks.
    */
  private unsubscribeFromUser(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
      this.userSubscription = null;
    }
  }


  /**
   * Tracks users by their unique ID to optimize rendering in Angular templates.
   * 
   * @param index - The index of the user in the list.
   * @param user - The user object.
   * @returns The unique identifier for the user.
   */
  trackByUserId(index: number, user: User): string {
    return user.userId ? user.userId : index.toString();
  }


  /**
   * Enables the editing mode for the channel name.
   */
  startEditingName(): void {
    this.isEditingName = true;
  }


  /**
   * Enables the editing mode for the channel description.
   */
  startEditingDescription(): void {
    this.isEditingDescription = true;
  }


  /**
   * Saves the edited channel name after validation and duplication checks.
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

    const validationError = this.validateName(this.editedName);
    if (validationError) {
      this.nameErrorMessage = validationError;
      return;
    }

    try {
      const isDuplicate = await this.isDuplicateChannelName(this.editedName);
      if (isDuplicate) {
        this.nameErrorMessage = 'A channel with this name already exists.';
        return;
      }

      await this.updateChannelName();
    } catch (error) {
      this.nameErrorMessage = 'Error saving the name. Please try again.';
    }
  }


  /**
   * Validates the channel name to ensure it meets the required criteria.
   * @param name - The channel name to validate.
   * @returns A validation error message if invalid, otherwise `null`.
   */
  private validateName(name: string): string | null {
    if (name.length > 17) {
      return 'The channel name must be at most 17 characters long.';
    }
    return null;
  }


  /**
   * Checks if a channel name is already in use to prevent duplicates.
   * @param name - The channel name to check for duplication.
   * @returns A promise that resolves to `true` if the name is duplicate, otherwise `false`.
   */
  private async isDuplicateChannelName(name: string): Promise<boolean> {
    const duplicateChannel = await this.channelService.getChannelByName(name, this.channel!.isPrivate);
    return !!duplicateChannel && duplicateChannel.id !== this.channel!.id;
  }


  /**
 * Updates the channel's name with the edited value.
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


  /**
   * Allows the current user to leave the channel.
   */
  async leaveChannel(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();

    if (this.channel && currentUser) {
      try {
        await this.channelService.removeUserFromChannel(this.channel.id, currentUser.uid, this.channel.isPrivate);
        this.chatService.setCurrentChat(null, false);
        this.close.emit();
      } catch (error) {
      }
    }
  }


  /**
   * Listens for click events on the document to close the popup when clicking outside.
   * @param event - The click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closePopup(event);
    }
  }


  /**
 * Closes the channel info popup.
 * @param event - The event that triggered the popup closure.
 */
  closePopup(event: Event): void {
    event.stopPropagation();
    this.close.emit();
  }


  /**
   * Opens the profile view for a selected user.
   * @param user - The user whose profile is to be viewed.
   */
  openProfile(user: User): void {
    this.selectedUser = user;
    this.showChannelPopup = false;
  }


  /**
 * Closes the profile card view and returns to the channel popup.
 */
  closeProfileCard(): void {
    this.selectedUser = null;
    this.showChannelPopup = true;
  }
}
