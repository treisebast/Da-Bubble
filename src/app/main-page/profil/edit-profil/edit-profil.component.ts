import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../shared/models/user.model';
import { UserService } from '../../../shared/services/user.service';

@Component({
  selector: 'app-edit-profil',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './edit-profil.component.html',
  styleUrls: ['./edit-profil.component.scss'],
})
export class EditProfilComponent {
  @Input() ownUser: Partial<User> = {};
  @Output() closeEditProfil = new EventEmitter<boolean>();

  editProfilForm = new FormGroup({
    name: new FormControl('', [Validators.minLength(3), Validators.required]),
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
    ]),
  });

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.patchForm();
  }

  private patchForm() {
    this.editProfilForm.patchValue({
      name: this.ownUser.name || '',
      email: this.ownUser.email || '',
    });
  }

  get name(): AbstractControl {
    return this.editProfilForm.get('name')!;
  }

  get email(): AbstractControl {
    return this.editProfilForm.get('email')!;
  }

  onSubmitSave(): void {
    if (this.editProfilForm.valid) {
      this.userService.updateUser({
        ...this.ownUser,
        ...this.editProfilForm.value,
      } as User);
      this.editProfilForm.reset();
      this.closeEditProfil.emit(false);
    }
  }

  cancel(): void {
    this.editProfilForm.reset();
    this.closeEditProfil.emit(false);
  }
}
