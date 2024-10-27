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

  constructor(public menuElementRef: ElementRef) { }


  /**
 * Toggles the visibility of the menu.
 * Prevents the click event from propagating to parent elements.
 * @param event - The mouse event that triggered the toggle
 */
  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }


  /**
   * Listens for click events on the document.
   * Closes the menu when a click occurs outside of the menu.
   * @param event - The mouse event that occurred
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.menuOpen = false;
  }


  /**
    * Handles the mouse entering the menu area.
    * Sets the `isMouseOverMenu` flag to true.
    */
  onMouseEnterMenu() {
    this.isMouseOverMenu = true;
  }


  /**
   * Handles the mouse leaving the menu area.
   * Sets the `isMouseOverMenu` flag to false.
   */
  onMouseLeaveMenu() {
    this.isMouseOverMenu = false;
  }


  /**
   * Emits the edit event with the associated message.
   * Closes the menu after emitting the event.
   */
  onEdit() {
    this.edit.emit(this.message);
    this.menuOpen = false;
  }


  /**
   * Emits the delete event with the associated message.
   * Closes the menu after emitting the event.
   */
  onDelete() {
    this.delete.emit(this.message);
    this.menuOpen = false;
  }


  /**
   * Closes the menu by setting `menuOpen` to false.
   */
  closeMenu() {
    this.menuOpen = false;
  }
}

