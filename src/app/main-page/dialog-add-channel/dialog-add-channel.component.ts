import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
import { DialogAddUserComponent } from './dialog-add-user/dialog-add-user.component';

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
    DialogAddUserComponent,
  ],
  templateUrl: './dialog-add-channel.component.html',
  styleUrls: ['./dialog-add-channel.component.scss'],
})
export class DialogAddChannelComponent {
  loading = false;
  channelName = '';
  description = '';
  isDialogOpen = false;
  currentUserId = '';

  constructor(
    public dialogRef: MatDialogRef<DialogAddChannelComponent>,
    private channelService: ChannelService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.subscribeToDialogEvents();
    this.setCurrentUser();
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
   * Creates a new channel and navigates to the add users page.
   */
  async createChannelAndGoToAddUsers() {
    const newChannel: Channel = this.createChannelObject();
    try {
      await this.saveChannelToFirebase(newChannel).then(() => {
        this.openAddUsersToChannelDialog(newChannel);
      });
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  }

  /**
   * Opens the dialog to add users to a channel.
   * @param newChannel - The new channel to add users to.
   */
  openAddUsersToChannelDialog(newChannel: Channel) {
    const dialogRef = this.dialog.open(DialogAddUserComponent, {
      data: { channel: newChannel },
    });
  }

  /**
   * Saves a channel to Firebase.
   * @param newChannel - The new channel to be saved.
   */
  async saveChannelToFirebase(newChannel: Channel) {
    this.loading = true;

    try {
      const channelDocRef = await this.channelService.addChannel(newChannel);
      newChannel.id = channelDocRef.id;

      console.log('adding Channel:', newChannel);
      this.dialogRef.close(newChannel);
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
