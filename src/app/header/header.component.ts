import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    CommonModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  currentUser = {
      name: "Tobias Wall",
      imgSrc: "./assets/img/profile/1.png",
      online: true
    }

  openDialog() {

  }

}

