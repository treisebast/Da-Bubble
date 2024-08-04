import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { User } from '../../../shared/models/user.model';

@Component({
  selector: 'app-edit-profil',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './edit-profil.component.html',
  styleUrls: ['./edit-profil.component.scss'],
})
export class EditProfilComponent {
  @Input() ownUser: Partial<User> = {};

  editProfilForm = new FormGroup({
    name: new FormControl('', [Validators.minLength(3), Validators.required]),
    email: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.pattern('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
    ]),
  });

  constructor() {}

  get name(): AbstractControl {
    return this.editProfilForm.get('name')!;
  }

  get email(): AbstractControl {
    return this.editProfilForm.get('email')!;
  }

  save(): void {
    if (this.editProfilForm.valid) {
      console.log('Form data:', this.editProfilForm.value);
      // Hier kannst du die Logik zum Speichern der Daten einfügen
    }
  }

  cancel(): void {
    this.editProfilForm.reset();
    // Hier kannst du die Logik zum Abbrechen einfügen
  }
}
