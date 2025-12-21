/**
 * Contact service - Business logic for contact messages
 */

import { HttpError } from "../../utils/http.js";
import type { CreateContactMessageInput, ContactMessage } from "./contact.types.js";
import {
  createContactMessage,
  listContactMessages,
  getContactMessageById,
} from "./contact.repository.js";

/**
 * Submit a contact form message
 */
export async function submitContactMessage(
  input: CreateContactMessageInput,
): Promise<ContactMessage> {
  // Validate input
  if (!input.email || !input.topic || !input.message) {
    throw new HttpError(400, "E.CONTACT.INVALID_INPUT", "CONTACT_INVALID_INPUT");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new HttpError(400, "E.CONTACT.INVALID_EMAIL", "CONTACT_INVALID_EMAIL");
  }

  // Validate topic length
  if (input.topic.length > 200) {
    throw new HttpError(400, "E.CONTACT.TOPIC_TOO_LONG", "CONTACT_TOPIC_TOO_LONG");
  }

  // Validate message length
  if (input.message.length > 5000) {
    throw new HttpError(400, "E.CONTACT.MESSAGE_TOO_LONG", "CONTACT_MESSAGE_TOO_LONG");
  }

  // Sanitize input (trim whitespace)
  const sanitizedInput: CreateContactMessageInput = {
    userId: input.userId || null,
    email: input.email.trim(),
    topic: input.topic.trim(),
    message: input.message.trim(),
  };

  return await createContactMessage(sanitizedInput);
}

/**
 * List contact messages (admin only)
 */
export async function getContactMessagesList(options: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}): Promise<ContactMessage[]> {
  return await listContactMessages(options);
}

/**
 * Get a contact message by ID (admin only)
 */
export async function getContactMessage(id: string): Promise<ContactMessage> {
  const message = await getContactMessageById(id);
  if (!message) {
    throw new HttpError(404, "E.CONTACT.NOT_FOUND", "CONTACT_NOT_FOUND");
  }
  return message;
}
