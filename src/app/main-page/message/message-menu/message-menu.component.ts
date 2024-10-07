import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, HostListener, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-message-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-menu.component.html',
  styleUrls: ['./message-menu.component.scss'],
})

export class MessageMenuComponent {
  @Input() isCurrentUser: boolean = false;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  menuOpen: boolean = false;

  @ViewChild('menuOptions') menuOptionsRef!: ElementRef;

  constructor(public menuElementRef: ElementRef) {}

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.menuOpen = false;
  }

  onEdit() {
    this.edit.emit();
    this.menuOpen = false;
  }

  onDelete() {
    this.delete.emit();
    this.menuOpen = false;
  }

  closeMenu() {
    this.menuOpen = false;
  }
}

