import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models/user.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-avatar-choice',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule, RouterOutlet, RouterModule],
  templateUrl: './avatar-choice.component.html',
  styleUrls: ['./avatar-choice.component.scss']
})
export class AvatarChoiceComponent {
  selectedAvatar: string = '/assets/img/front-page/avatar.svg';  // Default avatar image

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }


  //bei klick auf weiter, mit authService.getUser(). den authentifizierungsstatus abrufen und subscriben ....subscribe(user => {die logik})..., danach mit userService.updateUser den avatar updaten

}
