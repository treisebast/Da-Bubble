import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MAT_DIALOG_DEFAULT_OPTIONS, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  providers: [
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { hasBackdrop: false } }
  ]
})
export class ConfirmationDialogComponent {

  /**
   * Creates an instance of ConfirmationDialogComponent.
   * @param {Object} data - The data injected into the dialog.
   * @param {string} data.message - The message to be displayed in the dialog.
   * @param {string} [data.image] - An optional image to be displayed in the dialog.
   */
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { message: string; image?: string },
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>
  ) { }


  /**
 * Handles the end of an animation event.
 * Closes the dialog if the animation name is 'slide-out'.
 * @param {AnimationEvent} event - The animation event that occurred.
 */
  onAnimationEnd(event: AnimationEvent): void {
    if (event.animationName === 'slide-out' || event.animationName === 'slide-up-out') {
      this.dialogRef.close();
    }
  }
}
