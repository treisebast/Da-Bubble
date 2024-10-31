import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-privacypolicy',
  standalone: true,
  imports: [
    MatCardModule,
    ScrollingModule,
  ],
  templateUrl: './privacypolicy.component.html',
  styleUrl: './privacypolicy.component.scss',
})
export class PrivacypolicyComponent {

  /**
 * The URL to the Privacy Policy page.
 */
  privacyPolicy: string =
    'https://www.privacypolicies.com/privacy-policy-generator/';


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
 * Handles click on overlay to close the privacy policy if clicked outside the mat-card.
 * @param event MouseEvent
 */
  onOverlayClick(event: MouseEvent) {
    this.goBack();
  }
}
