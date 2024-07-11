import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../shared/services/user.service';
import { User } from '../shared/models/user.model';

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
  editingUserId: string | null = null;

  constructor(private userService: UserService, private fb: FormBuilder) {
    this.userForm = this.fb.group({
      userId: [''],
      name: [''],
      email: [''],
      avatarUrl: [''],
      status: ['online'],
      lastSeen: [new Date()]
    });
  }

  ngOnInit(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  addUser(): void {
    const newUser: User = this.userForm.value;
    if (this.editingUserId) {
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
      userId: user.userId,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastSeen: user.lastSeen
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
      avatarUrl: '',
      status: 'online',
      lastSeen: new Date()
    });
    this.editingUserId = null;
  }
}
