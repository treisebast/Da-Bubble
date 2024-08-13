import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dialog-options',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './dialog-options.component.html',
  styleUrls: ['./dialog-options.component.scss']
})
export class DialogOptionsComponent {

  constructor(public dialogRef: MatDialogRef<DialogOptionsComponent>) {}

  onEdit(): void {
    this.dialogRef.close('edit');
  }

  onDelete(): void {
    this.dialogRef.close('delete');
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
