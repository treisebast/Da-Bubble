import { Component } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  creationMessage: string = 'Konto erfolgreich erstellt!';
  emailSendMessage: string = 'E-Mail gesendet';
  signInMessage: string = 'Anmelden';

}
