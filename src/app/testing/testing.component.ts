import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { serverTimestamp } from '@angular/fire/firestore';
import { User } from '../shared/models/user.model';
import { UserService } from '../shared/services/user.service';
import { DirectMessageService } from '../shared/services/direct-message.service';
import { Message } from '../shared/models/message.model';

/**
 * Testing Component
 * Provides functionality to add, edit, and delete users and messages for testing purposes.
 */
@Component({
  selector: 'app-testing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './testing.component.html',
  styleUrls: ['./testing.component.scss']
})

export class TestingComponent implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  messageForm: FormGroup;
  selectedChatUser: User | null = null;
  editingUserId: string | null = null;
  messages: Message[] = [];
  currentChatId: string | null = null;
  currentUser: User | null = null;

  constructor(
    private userService: UserService,
    private messageService: DirectMessageService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      userId: [''],
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      avatar: [''],
      status: ['online'],
      lastSeen: [serverTimestamp()]
    });

    this.messageForm = this.fb.group({
      content: ['', [Validators.required]],
      senderId: ['', [Validators.required]],
      attachments: [[]],
      timestamp: [serverTimestamp()]
    });
  }

  ngOnInit(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });

    if (this.selectedChatUser) {
      this.loadMessages();
    }
  }

  /**
   * Selects a user to start a chat with and loads the messages for the chat.
   * @param {User} user - The user to start a chat with.
   */
  async selectChatUser(user: User): Promise<void> {
    this.selectedChatUser = user;
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      console.error('Current user not found');
      return;
    }
    this.currentChatId = await this.messageService.getOrCreateChat(currentUser.userId, user.userId);
    this.loadMessages();
  }

  /**
   * Loads the messages for the current chat.
   */
  loadMessages(): void {
    if (!this.currentChatId) {
      return;
    }
    this.messageService.getDirectMessages(this.currentChatId).subscribe(messages => {
      this.messages = messages;
    });
  }

  /**
   * Adds a new user or updates an existing user.
   */
  addUser(): void {
    const newUser: User = this.userForm.value;
    newUser.lastSeen = serverTimestamp();
    if (this.editingUserId) {
      newUser.userId = this.editingUserId;
      this.userService.updateUser(newUser).then(() => {
        this.resetForm();
      });
    } else {
      this.userService.addUser(newUser).then(() => {
        this.resetForm();
      });
    }
  }

  /**
   * Fills the form with the user's information for editing.
   * @param {User} user - The user to edit.
   */
  editUser(user: User): void {
    this.userForm.setValue({
      userId: user.userId || '',
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '',
      status: user.status || 'online',
      lastSeen: user.lastSeen || serverTimestamp()
    });
    this.editingUserId = user.userId;
  }

  /**
   * Deletes a user by their ID.
   * @param {string} userId - The ID of the user to delete.
   */
  deleteUser(userId: string): void {
    this.userService.deleteUser(userId).then(() => {
      this.resetForm();
    });
  }

  /**
   * Resets the user form.
   */
  resetForm(): void {
    this.userForm.reset({
      userId: '',
      name: '',
      email: '',
      avatar: '',
      status: 'online',
      lastSeen: serverTimestamp()
    });
    this.editingUserId = null;
  }

  /**
   * Adds a new message to the current chat.
   */
  addMessage(): void {
    if (!this.currentChatId) {
      return;
    }
    const newMessage: Message = this.messageForm.value;
    newMessage.timestamp = serverTimestamp();
    this.messageService.addDirectMessage(this.currentChatId, newMessage).then(() => {
      this.messageForm.reset({ content: '', senderId: this.currentUser?.userId || '', attachments: [], timestamp: serverTimestamp() });
      this.loadMessages();
    });
  }

  /**
   * Gets the name of a user by their ID.
   * @param {string} userId - The ID of the user.
   * @returns {string} - The name of the user or 'Unknown'.
   */
  getUserName(userId: string): string {
    const user = this.users.find(user => user.userId === userId);
    return user ? user.name : 'Unknown';
  }

  /**
   * Sets the current user.
   * @param {User} user - The user to set as the current user.
   */
  setCurrentUser(user: User): void {
    this.currentUser = user;
    this.messageForm.patchValue({ senderId: user.userId });
    console.log('Current user set to:', this.currentUser);
  }

  /**
   * Gets the current logged-in user.
   * @returns {User | null} - The current user or null if not found.
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }
}
