export interface DirectMessage {
  id?: string;
  content: string;
  senderId: string;
  timestamp: any;
  attachments?: string[];
}
