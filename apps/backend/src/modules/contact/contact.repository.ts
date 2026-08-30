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
    respondedAt: row.responded_at,
    response: row.response,
  };
}

/**
 * Create a new contact message
 * Uses parameterized queries via Knex to prevent SQL injection
 */
export async function createContactMessage(
  input: CreateContactMessageInput,
): Promise<ContactMessage> {
  const rows = (await db(CONTACT_MESSAGES_TABLE)
    .insert({
      user_id: input.userId || null,
      email: input.email,
      topic: input.topic,
      message: input.message,
    })
    .returning([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
      "responded_at",
      "response",
    ])) as ContactMessageRow[];

  const row = rows[0];
  return toContactMessage(row);
}

/**
 * List contact messages (admin only)
 */
export async function listContactMessages(options: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  openOnly?: boolean;
}): Promise<ContactMessage[]> {
  const { limit = 50, offset = 0, unreadOnly = false, openOnly = false } = options;

  let queryBuilder = db(CONTACT_MESSAGES_TABLE)
    .select([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
      "responded_at",
      "response",
    ])
    .orderBy("created_at", "desc")
    .limit(Math.min(limit, 100))
    .offset(offset);

  if (unreadOnly) {
    queryBuilder = queryBuilder.whereNull("read_at");
  }

  if (openOnly) {
    queryBuilder = queryBuilder.whereNull("responded_at");
  }

  const rows = (await queryBuilder) as ContactMessageRow[];
  return rows.map(toContactMessage);
}

/**
 * Get a contact message by ID
 */
export async function getContactMessageById(id: string): Promise<ContactMessage | undefined> {
  const row = (await db(CONTACT_MESSAGES_TABLE)
    .select([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
      "responded_at",
      "response",
    ])
    .where("id", id)
    .first()) as ContactMessageRow | undefined;

  return row ? toContactMessage(row) : undefined;
}

/**
 * Mark a contact message as read
 */
export async function markContactMessageAsRead(
  id: string,
  userId: string,
): Promise<ContactMessage | undefined> {
  const now = new Date().toISOString();
  const rows = (await db(CONTACT_MESSAGES_TABLE)
    .where("id", id)
    .update({
      read_at: now,
      read_by_user_id: userId,
    })
    .returning([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
      "responded_at",
      "response",
    ])) as ContactMessageRow[];

  const row = rows[0];
  return row ? toContactMessage(row) : undefined;
}

/**
 * Mark a contact message as responded
 */
export async function markContactMessageAsResponded(
  id: string,
  _userId: string,
): Promise<ContactMessage | undefined> {
  const now = new Date().toISOString();
  const rows = (await db(CONTACT_MESSAGES_TABLE)
    .where("id", id)
    .update({
      responded_at: now,
    })
    .returning([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
      "responded_at",
      "response",
    ])) as ContactMessageRow[];

  const row = rows[0];
  return row ? toContactMessage(row) : undefined;
}

/**
 * Save response text for a contact message
 */
export async function saveContactMessageResponse(
  id: string,
  userId: string,
  response: string,
): Promise<ContactMessage | undefined> {
  const now = new Date().toISOString();
  const rows = (await db(CONTACT_MESSAGES_TABLE)
    .where("id", id)
    .update({
      response: response.trim(),
      responded_at: now,
    })
    .returning([
      "id",
      "user_id",
      "email",
      "topic",
      "message",
      "created_at",
      "read_at",
      "read_by_user_id",
      "responded_at",
      "response",
    ])) as ContactMessageRow[];

  const row = rows[0];
  return row ? toContactMessage(row) : undefined;
}
