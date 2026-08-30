/**
 * Contact service - Business logic for contact messages
 */

import { HttpError } from "../../utils/http.js";
import type { CreateContactMessageInput, ContactMessage } from "./contact.types.js";
import {
  createContactMessage,
  listContactMessages,
  getContactMessageById,
  markContactMessageAsRead,
  markContactMessageAsResponded,
  saveContactMessageResponse,
} from "./contact.repository.js";

/**
 * Submit a contact form message
 */
export async function submitContactMessage(
  input: CreateContactMessageInput,
): Promise<ContactMessage> {
  // Sanitize input (trim whitespace) before validation
  const sanitizedInput: CreateContactMessageInput = {
    userId: input.userId || null,
    email: input.email?.trim() ?? "",
    topic: input.topic?.trim() ?? "",
    message: input.message?.trim() ?? "",
  };

  // Validate input
  if (!sanitizedInput.email || !sanitizedInput.topic || !sanitizedInput.message) {
    throw new HttpError(400, "E.CONTACT.INVALID_INPUT", "CONTACT_INVALID_INPUT");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedInput.email)) {
    throw new HttpError(400, "E.CONTACT.INVALID_EMAIL", "CONTACT_INVALID_EMAIL");
  }

  // Validate topic length
  if (sanitizedInput.topic.length > 200) {
    throw new HttpError(400, "E.CONTACT.TOPIC_TOO_LONG", "CONTACT_TOPIC_TOO_LONG");
  }

  // Validate message length
  if (sanitizedInput.message.length > 5000) {
    throw new HttpError(400, "E.CONTACT.MESSAGE_TOO_LONG", "CONTACT_MESSAGE_TOO_LONG");
  }

  return await createContactMessage(sanitizedInput);
}

/**
 * List contact messages (admin only)
 */
export async function getContactMessagesList(options: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  openOnly?: boolean;
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

/**
 * Mark a contact message as read (admin only)
 */
export async function markMessageAsRead(id: string, userId: string): Promise<ContactMessage> {
  const message = await markContactMessageAsRead(id, userId);
  if (!message) {
    throw new HttpError(404, "E.CONTACT.NOT_FOUND", "CONTACT_NOT_FOUND");
  }
  return message;
}

/**
 * Mark a contact message as responded (admin only)
 */
export async function markMessageAsResponded(id: string, userId: string): Promise<ContactMessage> {
  const message = await markContactMessageAsResponded(id, userId);
  if (!message) {
    throw new HttpError(404, "E.CONTACT.NOT_FOUND", "CONTACT_NOT_FOUND");
  }
  return message;
}

/**
 * Save response text for a contact message (admin only)
 */
export async function saveMessageResponse(
  id: string,
  userId: string,
  response: string,
): Promise<ContactMessage> {
  if (!response || !response.trim()) {
    throw new HttpError(400, "E.CONTACT.INVALID_INPUT", "Response text is required");
  }

  if (response.length > 5000) {
    throw new HttpError(
      400,
      "E.CONTACT.RESPONSE_TOO_LONG",
      "Response text is too long (max 5000 characters)",
    );
  }

  const message = await saveContactMessageResponse(id, userId, response);
  if (!message) {
    throw new HttpError(404, "E.CONTACT.NOT_FOUND", "CONTACT_NOT_FOUND");
  }
  return message;
}
