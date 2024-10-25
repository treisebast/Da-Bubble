import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogAddChannelComponent } from '../dialog-add-channel/dialog-add-channel.component';
import { ChannelService } from '../../shared/services/channel.service';
import { ChatService } from '../../shared/services/chat-service.service';
import { AuthService } from '../../shared/services/auth.service';
import { UserService } from '../../shared/services/user.service';
import { Channel, NewChannel } from '../../shared/models/channel.model';
import { UserWithImageStatus } from '../../shared/models/user.model';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Observable, Subscription, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss'],
  animations: [
    trigger('dropDown', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: 0,
          'padding-top': '0px',
          'padding-right': '0px',
          'padding-bottom': '0px',
          'margin-top': '0px',
          'margin-right': '0px',
          'margin-bottom': '0px',
        })
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: 1,
          'padding-top': '*',
          'padding-right': '*',
          'padding-bottom': '*',
          'margin-top': '*',
          'margin-right': '*',
          'margin-bottom': '*',
        })
      ),
      transition('collapsed => expanded', animate('150ms ease-in')),
      transition('expanded => collapsed', animate('150ms ease-out')),
    ]),
  ],
})
export class SideNavComponent implements OnInit, OnDestroy {
  menuChannelIsDropedDown: boolean = false;
  directMessagesIsDropedDown: boolean = false;

  publicChannels: Channel[] = [];
  privateChannels: Channel[] = [];
  workspaceUsers: UserWithImageStatus[] = [];
  currentUser!: UserWithImageStatus;
  currentChat: { chat: Channel | null; isPrivate: boolean } = { chat: null, isPrivate: false };
  subs = new Subscription();
  @Output() serverNameClicked = new EventEmitter<void>();
  @Output() channelSelected = new EventEmitter<void>();

  constructor(
    private channelService: ChannelService,
    private chatService: ChatService,
    private dialog: MatDialog,
    private authService: AuthService,
    private userService: UserService
  ) { }

  ngOnInit() {
    const user$ = this.authService.getUser().pipe(
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.userService.getUser(firebaseUser.uid).pipe(
            map(user => {
              this.currentUser = { ...user, isImageLoaded: false };
              return this.currentUser;
            })
          );
        } else {
          return of(null);
        }
      })
    );

    const publicChannels$ = user$.pipe(
      switchMap(user => {
        if (user) {
          return this.channelService.getChannelsForUser(user.userId, false);
        } else {
          return of([]);
        }
      })
    );

    const privateChannels$ = user$.pipe(
      switchMap(user => {
        if (user) {
          return this.channelService.getChannelsForUser(user.userId, true);
        } else {
          return of([]);
        }
      })
    );

    // Kombiniere die Observables
    const channelsSub = combineLatest([publicChannels$, privateChannels$]).subscribe(([publicChannels, privateChannels]) => {
      this.publicChannels = publicChannels;
      this.privateChannels = privateChannels;
      this.showWorkspaceUsers();
    });

    this.subs.add(channelsSub);

    // Abonniere den aktuellen Chat
    const chatSub = this.chatService.currentChat$.subscribe((chatData) => {
      this.currentChat = chatData;
    });
    this.subs.add(chatSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }


  trackByUserId(index: number, user: UserWithImageStatus): string {
    return user.userId;
  }

  /**
   * Lädt die Liste der Benutzer aus dem UserService und aktualisiert die Workspace-Benutzer.
   */
  private showWorkspaceUsers() {
    const usersSub = this.userService.getUsers().subscribe({
      next: (users) => {
        users.forEach((user) => {
          const existingUserIndex = this.workspaceUsers.findIndex(u => u.userId === user.userId);
          if (existingUserIndex !== -1) {
            const existingUser = this.workspaceUsers[existingUserIndex];
            this.workspaceUsers[existingUserIndex] = { ...existingUser, ...user };
          } else {
            this.workspaceUsers.push({ ...user, isImageLoaded: false });
          }
        });
        this.moveCurrentUserToTop();
      },
      error: (err) => console.error('Error loading workspace users:', err),
    });
    this.subs.add(usersSub);
  }

  /**
   * Verschiebt den aktuellen Benutzer an den Anfang des `workspaceUsers`-Arrays.
   */
  private moveCurrentUserToTop() {
    const currentUserIndex = this.workspaceUsers.findIndex(
      (user) => user.userId === this.currentUser.userId
    );
    if (currentUserIndex !== -1) {
      const currentUser = this.workspaceUsers.splice(currentUserIndex, 1)[0];
      this.workspaceUsers.unshift(currentUser);
    }
  }

  /**
   * Behandelt das Ereignis, wenn ein Bild für einen Benutzer geladen wird.
   */
  onImageLoad(userId: string) {
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = true;
    }
  }

  /**
   * Behandelt das Ereignis, wenn ein Bild für einen Benutzer nicht geladen werden kann.
   */
  onImageError(userId: string) {
    const user = this.workspaceUsers.find((u) => u.userId === userId);
    if (user) {
      user.isImageLoaded = false;
      user.avatar = 'assets/img/profile/fallback_user.png';
    }
  }

  openMenuChannelDropdown() {
    this.menuChannelIsDropedDown = !this.menuChannelIsDropedDown;
  }

  openDirectMessagesDropdown() {
    this.directMessagesIsDropedDown = !this.directMessagesIsDropedDown;
  }

  /**
   * Findet oder erstellt einen privaten Chat-Kanal mit dem angegebenen Benutzer.
   */
  async findOrCreatePrivateChannelWithUser(user: UserWithImageStatus) {
    const isSelfChat = user.userId === this.currentUser.userId;
    const privateChat = this.findExistingPrivateChannel(user, isSelfChat);
    if (!privateChat) {
      const newChannel = this.createNewChannel(user, isSelfChat);
      await this.addAndSetChannel(newChannel);
    } else {
      this.chatService.setCurrentChat(privateChat, true);
    }
  }

  /**
   * Findet einen vorhandenen privaten Kanal basierend auf dem bereitgestellten Benutzer und Chat-Typ.
   */
  private findExistingPrivateChannel(
    user: UserWithImageStatus,
    isSelfChat: boolean
  ): Channel | undefined {
    return this.privateChannels.find((channel) =>
      isSelfChat
        ? channel.members.length === 1 &&
          channel.members.includes(this.currentUser.userId)
        : channel.members.includes(this.currentUser.userId) &&
          channel.members.includes(user.userId)
    );
  }

  /**
   * Erstellt einen neuen Kanal für einen Benutzer.
   */
  private createNewChannel(user: UserWithImageStatus, isSelfChat: boolean): NewChannel {
    return {
      name: isSelfChat ? 'Personal Notes' : `${user.name}`,
      description: isSelfChat ? 'Your personal space' : '',
      createdBy: this.currentUser.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: isSelfChat
        ? [this.currentUser.userId]
        : [this.currentUser.userId, user.userId],
      isPrivate: true,
    };
  }

  /**
   * Fügt einen neuen Kanal hinzu und setzt ihn als aktuellen Chat.
   */
  async addAndSetChannel(newChannel: NewChannel) {
    try {
      const docRef = await this.channelService.addChannel(newChannel);
      const createdChannel: Channel = { ...newChannel, id: docRef.id };
      this.chatService.setCurrentChat(createdChannel, true);
      this.showChannel(createdChannel, true);
    } catch (error) {
      console.error('Error creating private channel:', error);
    }
  }

  /**
   * Öffnet einen Dialog zum Hinzufügen eines neuen Kanals.
   */
  addNewChannel() {
    const dialogRef = this.dialog.open(DialogAddChannelComponent, {
      disableClose: false,
      panelClass: 'addChannelDialog',
    });

    dialogRef.afterClosed().subscribe((result: NewChannel | undefined) => {
      if (result) {
        this.addAndSetChannel(result);
      }
    });
  }

  /**
   * Zeigt den angegebenen Kanal in der Chat-Oberfläche an.
   */
  showChannel(channel: Channel, isPrivate: boolean) {
    this.chatService.setCurrentChat(channel, isPrivate);
    this.channelSelected.emit();
  }

  /**
   * Setzt die ausgewählte Nachricht im Chat-Service.
   */
  setSelectedMessage() {
    this.chatService.setSelectedChat(true);
  }

  /**
   * Setzt den ausgewählten Chat-Zustand auf false und signalisiert, dass eine neue Nachricht erstellt wird.
   */
  newMessage() {
    this.chatService.setSelectedChat(false);
  }

  isActiveChannel(channel: Channel): boolean {
    return this.currentChat.isPrivate === false && this.currentChat.chat?.id === channel.id;
  }

  /**
   * Bestimmt, ob der gegebene Benutzer ein aktiver Teilnehmer im aktuellen Chat ist.
   */
  isActiveUser(user: UserWithImageStatus): boolean {
    if (this.currentChat.isPrivate && this.currentChat.chat) {
      const members = this.currentChat.chat.members;
      if (members.length === 1) {
        // Selbst-Chat
        return members[0] === this.currentUser.userId && user.userId === this.currentUser.userId;
      } else if (members.length === 2) {
        // Privater Chat mit einem anderen Benutzer
        const isCurrentUserInMembers = members.includes(this.currentUser.userId);
        const isUserInMembers = members.includes(user.userId);
        return isCurrentUserInMembers && isUserInMembers && user.userId !== this.currentUser.userId;
      }
    }
    return false;
  }

  onServerNameClick() {
    this.serverNameClicked.emit();
  }
}
