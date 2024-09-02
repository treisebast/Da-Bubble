import { Timestamp, FieldValue } from '@angular/fire/firestore';

export interface Message {
  id?: string;
  content: string;
  senderId: string;
  senderName?: string;
  timestamp: Timestamp | FieldValue;
  attachments?: string[];
  threadCount?: number;
  lastReplyTimestamp?: Timestamp | FieldValue;
  edited?: boolean;
  chatId: string;
  metadata?: {
    [key: string]: {
      name: string;
      size: number;
    }
  }
  reactions?: { [emoji: string]: string[] };
}