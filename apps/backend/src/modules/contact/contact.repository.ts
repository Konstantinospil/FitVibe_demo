/**
 * Contact repository - Database operations for contact messages
 */

import { db } from "../../db/connection.js";
import type {
  ContactMessage,
  ContactMessageRow,
  CreateContactMessageInput,
} from "./contact.types.js";

const CONTACT_MESSAGES_TABLE = "contact_messages";

function toContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    topic: row.topic,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
    readByUserId: row.read_by_user_id,
  };
}

/**
 * Create a new contact message
 * Uses parameterized queries via Knex to prevent SQL injection
 */
export async function createContactMessage(
  input: CreateContactMessageInput,
): Promise<ContactMessage> {
  const [row] = await db(CONTACT_MESSAGES_TABLE)
    .insert({
      user_id: input.userId || null,
      email: input.email,
      topic: input.topic,
      message: input.message,
    })
    .returning<ContactMessageRow[]>([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
    ]);

  return toContactMessage(row);
}

/**
 * List contact messages (admin only)
 */
export async function listContactMessages(options: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<ContactMessage[]> {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  let query = db(CONTACT_MESSAGES_TABLE)
    .select<
      ContactMessageRow[]
    >(["id", "user_id", "email", "topic", "message", "created_at", "read_at", "read_by_user_id"])
    .orderBy("created_at", "desc")
    .limit(Math.min(limit, 100))
    .offset(offset);

  if (unreadOnly) {
    query = query.whereNull("read_at");
  }

  const rows = await query;
  return rows.map(toContactMessage);
}

/**
 * Get a contact message by ID
 */
export async function getContactMessageById(id: string): Promise<ContactMessage | undefined> {
  const row = await db(CONTACT_MESSAGES_TABLE)
    .select<
      ContactMessageRow[]
    >(["id", "user_id", "email", "topic", "message", "created_at", "read_at", "read_by_user_id"])
    .where("id", id)
    .first();

  return row ? toContactMessage(row) : undefined;
}
