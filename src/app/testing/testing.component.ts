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
import { DirectMessage } from '../shared/models/directMessage.model';

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
  messages: DirectMessage[] = [];
  currentChatId: string | null = null;

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

  async selectChatUser(user: User): Promise<void> {
    this.selectedChatUser = user;
    const currentUser = this.getCurrentUser(); // Add logic to get the current user ID
    if (!currentUser) {
      return;
    }
    this.currentChatId = await this.messageService.getOrCreateChat(currentUser.userId, user.userId);
    this.loadMessages();
  }

  loadMessages(): void {
    if (!this.currentChatId) {
      return;
    }
    this.messageService.getDirectMessages(this.currentChatId).subscribe(messages => {
      this.messages = messages;
    });
  }

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

  deleteUser(userId: string): void {
    this.userService.deleteUser(userId).then(() => {
      this.resetForm();
    });
  }

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

  addMessage(): void {
    if (!this.currentChatId) {
      return;
    }
    const newMessage: DirectMessage = this.messageForm.value;
    newMessage.timestamp = serverTimestamp();
    this.messageService.addDirectMessage(this.currentChatId, newMessage).then(() => {
      this.messageForm.reset({ content: '', senderId: '', attachments: [], timestamp: serverTimestamp() });
      this.loadMessages();
    });
  }

  getUserName(userId: string): string {
    const user = this.users.find(user => user.userId === userId);
    return user ? user.name : 'Unknown';
  }

  getCurrentUser(): User | null {
    // Replace this with the actual logic to get the current user
    return this.users.find(user => user.email === 'marco-ammann@hotmail.com') || null;
  }
}
