import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogClose,
  MatDialogActions,
  MatDialogTitle,
} from '@angular/material/dialog';
import { User } from '../../../shared/models/user.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dialog-show-members',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatDialogClose,
    MatDialogActions,
    MatDialogTitle,
    MatIconModule,
  ],
  templateUrl: './dialog-show-members.component.html',
  styleUrls: ['./dialog-show-members.component.scss'],
})
export class DialogShowMembersComponent implements OnInit {
  isDialogOpen = false;

  constructor(
    public dialogRef: MatDialogRef<DialogShowMembersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { members: User[] }
  ) {}

  ngOnInit(): void {
    this.subscribeToDialogEvents();
  }

  // Close dialog and open profile popup
  openProfile(user: User): void {
    this.dialogRef.close(user);
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

  trackByUserId(index: number, user: User): string {
    return user.userId;
  }
}
