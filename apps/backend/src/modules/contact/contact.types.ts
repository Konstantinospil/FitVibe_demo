/**
 * Contact module types
 */

export interface ContactMessage {
  id: string;
  userId: string | null;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  readByUserId: string | null;
}

export interface CreateContactMessageInput {
  userId?: string | null;
  email: string;
  topic: string;
  message: string;
}

export interface ContactMessageRow {
  id: string;
  user_id: string | null;
  email: string;
  topic: string;
  message: string;
  created_at: string;
  read_at: string | null;
  read_by_user_id: string | null;
}
