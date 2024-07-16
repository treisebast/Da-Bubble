export interface Message {
  id?: string;
  content: string;
  senderId: string;
  timestamp: any;
  attachments?: string[];
}
