import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { IntroComponent } from './intro/intro.component';

@Component({
  selector: 'app-main-sign-in',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, CommonModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterOutlet, RouterModule, IntroComponent],
  templateUrl: './main-sign-in.component.html',
  styleUrl: './main-sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class MainSignInComponent {
  showSignUpDiv: boolean = true;
  showFooterDiv: boolean = true;
  showIntro: boolean = true;

  constructor(private router: Router) { }


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Subscribes to router navigation events to update the visibility of UI sections.
 */
  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showSignUpDiv = !(event.url.includes('signup') || event.url.includes('avatar') ||
          (event.url.includes('/imprint') || event.url.includes('/privacy')));
        this.showFooterDiv = !(event.url.includes('/imprint') || event.url.includes('/privacy'));
      }
    });
  }


  /**
* Handles the completion of the intro animation.
* @param {boolean} isComplete - The completion status of the intro animation.
*/
  handleIntroComplete(isComplete: boolean) {
    this.showIntro = !isComplete;
  }
}
