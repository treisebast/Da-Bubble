import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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


  /** Form group for editing the user's name */
  nameFormGroup = new FormGroup({
    name: new FormControl('', [Validators.minLength(3), Validators.required]),
    nameRepeat: new FormControl('', [
      Validators.minLength(3),
      Validators.required,
    ]),
  });


  /** Form group for editing the user's email */
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

  constructor(private userService: UserService) { }


  /**
  * Lifecycle hook that is called after data-bound properties are initialized.
  * Initializes the form with user data and sets up field validations.
  */
  ngOnInit() {
    this.patchForm();
    this.setupFieldValidation();
  }

  /**
  * Patches the form groups with the current user's data.
  */
  private patchForm() {
    this.nameFormGroup.patchValue({
      name: this.ownUser.name || '',
    });
    this.emailFormGroup.patchValue({
      email: this.ownUser.email || '',
    });
  }


  /**
 * Sets up field validation to ensure that the repeated fields match the original fields.
 * Adds custom validation for name and email repetition.
 */
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


  /**
 * Submits the form to save the edited name or email.
 * Updates the user's information if the form is valid.
 */
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


  /**
 * Cancels the editing process and resets the forms.
 * Emits an event to close the edit profile dialog.
 */
  cancel(): void {
    this.nameFormGroup.reset();
    this.emailFormGroup.reset();
    this.closeEditProfil.emit(false);
  }


  /**
 * Getter for the name form group's controls.
 * @returns The controls of the name form group
 */
  get nameControls() {
    return this.nameFormGroup.controls;
  }


  /**
 * Getter for the email form group's controls.
 * @returns The controls of the email form group
 */
  get emailControls() {
    return this.emailFormGroup.controls;
  }
}
