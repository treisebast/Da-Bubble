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
    DialogAddUserComponent
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
   * Save the new channel
   */
  async createChannelAndGoToAddUsers() {
    const newChannel: Channel = this.createChannelObject();
    try {
      await this.saveChannelToFirbase(newChannel);
    } catch (error) {
      console.error('Error creating channel:', error);
    } finally {
      this.addUsersToChannel(newChannel);
    }
  }

  /**
   * Add users to the channel
   * @param newChannel
   */
  addUsersToChannel(newChannel: Channel) {
    const dialogRef = this.dialog.open(DialogAddUserComponent, {
      data: { channel: newChannel },
    });
  }

  async saveChannelToFirbase(newChannel: Channel) {
    this.loading = true;

    try {
      // await this.channelService.addChannel(newChannel);
      await this.fakeDelay();
      this.dialogRef.close(newChannel);
    } catch (error) {
      console.error('Error adding channel:', error);
    } finally {
      this.loading = false;
    }
  }

  fakeDelay() {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  /**
   * Create a Channel object
   * @returns Channel
   */
  private createChannelObject(): Channel {
    return {
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
