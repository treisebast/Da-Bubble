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

  constructor(
    public dialogRef: MatDialogRef<DialogAddChannelComponent>,
    private channelService: ChannelService
  ) {}

  async saveChannel() {
    this.loading = true;
    const newChannel: Channel = {
      name: this.channelName,
      description: this.description,
      createdBy: 'user1', // Replace with actual user ID
      createdAt: new Date(),
      members: ['user1'], // Replace with actual member IDs
      updatedAt: new Date()
    };

    try {
      await this.channelService.addChannel(newChannel);
      this.dialogRef.close(newChannel);
    } catch (error) {
      console.error("Error adding channel: ", error);
    } finally {
      this.loading = false;
    }
  }
}
