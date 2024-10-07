import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Message } from '../../../shared/models/message.model';

@Component({
  selector: 'app-message-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-menu.component.html',
  styleUrls: ['./message-menu.component.scss'],
})

export class MessageMenuComponent {
  @Input() isCurrentUser: boolean = false;
  @Input() message!: Message;
  @Output() edit = new EventEmitter<Message>();
  @Output() delete = new EventEmitter<Message>();

  menuOpen: boolean = false;
  isMouseOverMenu: boolean = false;

  constructor(public menuElementRef: ElementRef) {}

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.menuOpen = false;
  }

  onMouseEnterMenu() {
    this.isMouseOverMenu = true;
  }

  onMouseLeaveMenu() {
    this.isMouseOverMenu = false;
  }

  onEdit() {
    this.edit.emit(this.message);
    this.menuOpen = false;
  }

  onDelete() {
    this.delete.emit(this.message);
    this.menuOpen = false;
  }

  closeMenu() {
    this.menuOpen = false;
  }
}

