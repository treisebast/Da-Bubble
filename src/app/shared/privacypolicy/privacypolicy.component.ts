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
  privacyPolicy: string =
    'https://www.privacypolicies.com/privacy-policy-generator/';
  goBack() {
    window.history.go(-1);
    return false;
  }
}
