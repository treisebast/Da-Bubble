import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogRef, MatDialogTitle, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Channel } from '../../shared/models/channel.model';
import { ChannelService } from '../../shared/services/channel.service';
import { AuthService } from '../../shared/services/auth.service';

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
    MatDialogModule
  ],
  templateUrl: './dialog-add-channel.component.html',
  styleUrls: ['./dialog-add-channel.component.scss']
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
    private authService: AuthService
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
  async saveChannel() {
    this.loading = true;
    const newChannel: Channel = this.createChannelObject();

    try {
      await this.channelService.addChannel(newChannel);
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
