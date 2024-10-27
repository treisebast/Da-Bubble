/**
 * Represents a user within the application.
 */
export interface User {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  status: string | boolean;
  lastSeen: any;
}

/**
 * Extends the User interface to include the image loading status.
 */
export interface UserWithImageStatus extends User {
  isImageLoaded?: boolean;
}
