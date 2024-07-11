import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-avatar-choice',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterOutlet, RouterModule],
  templateUrl: './avatar-choice.component.html',
  styleUrls: ['./avatar-choice.component.scss']
})
export class AvatarChoiceComponent {
  selectedAvatar: string = '/assets/img/front-page/avatar.svg';  // Standard-Avatar-Bild

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }
}