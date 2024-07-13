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

  goBack() {
    window.history.go(-1); 
    return false;
  }
}
