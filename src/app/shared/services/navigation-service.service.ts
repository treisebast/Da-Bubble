import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {

  /**
 * BehaviorSubject to hold the currently selected message.
 * Initialized with `null` indicating no message is selected by default.
 */
  private selectedMessageSubject = new BehaviorSubject<Message | null>(null);

  /**
 * Observable stream of the selected message.
 * Components can subscribe to this to get updates on message selection.
 */
  selectedMessage$ = this.selectedMessageSubject.asObservable();

  /**
 * Selects a message and emits it to all subscribers.
 * @param message - The message to be selected.
 */
  selectMessage(message: Message) {
    this.selectedMessageSubject.next(message);
  }
}
