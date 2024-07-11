export interface User {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: any;
}
