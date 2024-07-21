import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { MenuComponent } from './menu/menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    CommonModule,
    RouterModule,
    MenuComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  currentUser = {
    name: "Tobias Wall",
    imgSrc: "./assets/img/profile/3.svg",
    online: true
  }

  constructor() { }
  @ViewChild(MenuComponent) MenuContent!: MenuComponent;

  showContent = false;

  toggleContent() {
    console.log(this.showContent);
    this.showContent = !this.showContent;
  }


}
