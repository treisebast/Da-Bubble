import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-front-page',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule, ReactiveFormsModule, FormsModule],
  templateUrl: './front-page.component.html',
  styleUrl: './front-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrontPageComponent {
 
}
