import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dialog-edit-message',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './dialog-edit-message.component.html',
  styleUrls: ['./dialog-edit-message.component.scss']
})
export class DialogEditMessageComponent {
  updatedContent: string;

  constructor(
    public dialogRef: MatDialogRef<DialogEditMessageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { content: string }
  ) {
    this.updatedContent = data.content;
  }

  onSave(): void {
    this.dialogRef.close(this.updatedContent);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}