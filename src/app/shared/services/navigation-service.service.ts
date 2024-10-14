import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private selectedMessageSubject = new BehaviorSubject<Message | null>(null);
  selectedMessage$ = this.selectedMessageSubject.asObservable();

  selectMessage(message: Message) {
    this.selectedMessageSubject.next(message);
  }
}
