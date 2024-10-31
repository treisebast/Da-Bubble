import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [
    MatCardModule,
  ],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
})
export class ImprintComponent {
  
  /**
 * Navigates the user back to the previous page in the browser history.
 * Prevents the default action by returning false.
 * @returns {boolean} - Always returns false to prevent default browser behavior.
 */
  goBack() {
    window.history.go(-1);
    return false;
  }

  /**
 * Handles click on overlay to close the imprint if clicked outside the mat-card.
 * @param event MouseEvent
 */
  onOverlayClick(event: MouseEvent) {
    this.goBack();
  }
}
