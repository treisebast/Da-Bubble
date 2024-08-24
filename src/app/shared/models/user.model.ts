export interface User {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  status: string | boolean;
  lastSeen: any;
}

export interface UserWithImageStatus extends User {
  isImageLoaded?: boolean;
}
