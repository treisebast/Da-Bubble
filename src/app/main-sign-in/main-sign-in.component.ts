import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-sign-in',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, CommonModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterOutlet, RouterModule],
  templateUrl: './main-sign-in.component.html',
  styleUrl: './main-sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class MainSignInComponent {
  showSignUpDiv: boolean = true;
  showFooterDiv: boolean = true;

  constructor(private router: Router) { }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showSignUpDiv = !(event.url.includes('signup') || event.url.includes('avatar') ||
          (event.url.includes('/imprint') || event.url.includes('/privacy')));
        this.showFooterDiv = !(event.url.includes('/imprint') || event.url.includes('/privacy'));
      }
    });
  }

}
