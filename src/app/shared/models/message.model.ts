import { Timestamp, FieldValue } from '@angular/fire/firestore';

/**
 * Represents a message within a chat or channel.
 */
export interface Message {
  id?: string;
  content: string;
  content_lowercase?: string;
  senderId: string;
  senderName?: string;
  timestamp: Timestamp | FieldValue;
  attachments?: string[];
  threadCount?: number;
  lastReplyTimestamp?: Timestamp | null; 
  edited?: boolean;
  chatId: string;
  metadata?: {
    [key: string]: {
      name: string;
      size: number;
    }
  }
  reactions?: { [emoji: string]: string[] };
  isPrivateChat: boolean;
}
