export interface Channel {
  id?: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  updatedAt: Date;
}