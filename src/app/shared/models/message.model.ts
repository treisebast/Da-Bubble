import { Timestamp, FieldValue } from '@angular/fire/firestore';

export interface Message {
  id?: string;
  content: string;
  senderId: string;
  timestamp: Timestamp | FieldValue;
  attachments?: string[];
}
