import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { User } from '../../shared/models/user.model';
import { EditProfilComponent } from './edit-profil/edit-profil.component';
import { UserService } from '../../shared/services/user.service';
import { AuthService } from '../../shared/services/auth.service';
import { from, map, of, Subject, switchMap, take, takeUntil } from 'rxjs';
import { ChatService } from '../../shared/services/chat-service.service';
import { AvatarChoiceComponent } from '../../main-sign-in/avatar-choice/avatar-choice.component';
import { ChannelService } from '../../shared/services/channel.service';
import { NewChannel } from '../../shared/models/channel.model';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogActions, MatDialogClose, MatDialogTitle, MatDialogContent, MatCardModule, MatButtonModule, EditProfilComponent, AvatarChoiceComponent],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss',
})
export class ProfilComponent implements OnInit, OnDestroy {
  @Output() closeProfileCard = new EventEmitter<void>();
  @Input() onclickUser: Partial<User> = {};
  @Input() hideEditIconContainer: boolean = false;

  onclickUserID: string = '';
  isChangingAvatar: boolean = false;
  isEditingEmail: boolean = false;
  isEditingName: boolean = false;
  profiltext: string = 'Profil';
  ownUser: Partial<User> = {};
  ownUserID: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private chatService: ChatService,
    private channelService: ChannelService
  ) { }

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   * Subscribes to authentication and user data, and initializes user IDs.
   */
  ngOnInit(): void {
    this.initializeUser();
    this.onclickUserID = this.onclickUser.userId || '';
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * Signals all subscriptions to complete to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Emits an event to close the profile card.
   */
  closeProfil(): void {
    this.closeProfileCard.emit();
  }

  /**
   * Initiates the profile editing process based on the selected field.
   * @param text - The field to edit ('avatar', 'name', or 'email')
   */
  editProfil(text: string): void {
    this.profiltext = 'Dein Profil bearbeiten';
    switch (text) {
      case 'avatar':
        this.isChangingAvatar = true;
        break;
      case 'name':
        this.isEditingName = true;
        break;
      case 'email':
        this.isEditingEmail = true;
        break;
      default:
        break;
    }
  }

  /**
   * Closes the edit profile dialogs and resets editing flags.
   * @param event - Boolean indicating whether to close the edit dialogs
   */
  closeEditProfil(event: boolean): void {
    this.isEditingName = event;
    this.isEditingEmail = event;
    this.isChangingAvatar = event;
  }

  /**
   * Initiates a private chat with the specified user.
   * Checks if a private chat exists; if not, creates one.
   * @param userId - The ID of the user to chat with
   */
  sendMessage(userId: string): void {
    this.channelService
      .getPrivateChannels()
      .pipe(
        take(1),
        map((channels) =>
          channels.find((channel) => channel.members.includes(userId))
        ),
        switchMap((channel) =>
          channel ? of(channel) : this.createPrivateChat(userId)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (channel) => {
          if (channel && channel.id) {
            this.chatService.setCurrentChat(channel, true);
            this.closeProfil();
          }
        },
        error: (error) => { },
      });
  }

  /**
   * Creates a new private chat channel with the specified user.
   * @param userId - The ID of the user to chat with
   * @returns An observable of the created Channel
   */
  private createPrivateChat(userId: string) {
    const newChannel: NewChannel = {
      name: `Chat mit ${this.onclickUser.name}`,
      description: '',
      createdBy: this.ownUserID,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [this.ownUserID, userId],
      isPrivate: true,
    };

    return from(this.channelService.addChannel(newChannel)).pipe(
      switchMap((docRef) => this.channelService.getChannel(docRef.id, true))
    );
  }

  /**
   * Initializes the current user by subscribing to authentication and user data.
   */
  private initializeUser(): void {
    this.auth
      .getUser()
      .pipe(
        takeUntil(this.destroy$),
        switchMap((firebaseUser) => {
          if (firebaseUser?.uid) {
            return this.userService.getUser(firebaseUser.uid);
          }
          return of(null);
        }),
        take(1)
      )
      .subscribe((user) => {
        if (user) {
          this.ownUser = user;
          this.ownUserID = user.userId;
        }
      });
  }

  /**
   * Sets the selected avatar state.
   * @param event - Boolean indicating the avatar selection state
   */
  setSelectedAvatar(event: boolean): void {
    this.isChangingAvatar = event;
  }
}