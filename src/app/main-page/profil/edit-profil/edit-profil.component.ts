import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
  @Input() isEditingName: boolean = false;
  @Input() isEditingEmail: boolean = false;
  @Output() closeEditProfil = new EventEmitter<boolean>();

  nameFormGroup = new FormGroup({
    name: new FormControl('', [Validators.minLength(3), Validators.required]),
    nameRepeat: new FormControl('', [
      Validators.minLength(3),
      Validators.required,
    ]),
  });

  emailFormGroup = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
    ]),
    emailRepeat: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
    ]),
  });

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.patchForm();
    this.setupFieldValidation();
  }

  private patchForm() {
    this.nameFormGroup.patchValue({
      name: this.ownUser.name || '',
    });
    this.emailFormGroup.patchValue({
      email: this.ownUser.email || '',
    });
  }

  private setupFieldValidation() {
    this.nameFormGroup.valueChanges.subscribe(() => {
      const name = this.nameFormGroup.get('name')?.value;
      const nameRepeat = this.nameFormGroup.get('nameRepeat')?.value;
      if (name !== nameRepeat) {
        this.nameFormGroup.get('nameRepeat')?.setErrors({ mismatch: true });
      } else {
        this.nameFormGroup.get('nameRepeat')?.setErrors(null);
      }
    });

    this.emailFormGroup.valueChanges.subscribe(() => {
      const email = this.emailFormGroup.get('email')?.value;
      const emailRepeat = this.emailFormGroup.get('emailRepeat')?.value;
      if (email !== emailRepeat) {
        this.emailFormGroup.get('emailRepeat')?.setErrors({ mismatch: true });
      } else {
        this.emailFormGroup.get('emailRepeat')?.setErrors(null);
      }
    });
  }

  onSubmitSave(): void {
    if (this.isEditingName && this.nameFormGroup.valid) {
      this.userService.updateUser({
        ...this.ownUser,
        name: this.nameFormGroup.value.name,
      } as User);
      this.nameFormGroup.reset();
      this.closeEditProfil.emit(false);
    }

    if (this.isEditingEmail && this.emailFormGroup.valid) {
      this.userService.updateUser({
        ...this.ownUser,
        email: this.emailFormGroup.value.email,
      } as User);
      this.emailFormGroup.reset();
      this.closeEditProfil.emit(false);
    }
  }

  cancel(): void {
    this.nameFormGroup.reset();
    this.emailFormGroup.reset();
    this.closeEditProfil.emit(false);
  }

  get nameControls() {
    return this.nameFormGroup.controls;
  }

  get emailControls() {
    return this.emailFormGroup.controls;
  }
}
