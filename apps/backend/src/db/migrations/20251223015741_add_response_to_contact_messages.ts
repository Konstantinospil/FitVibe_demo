import type { Knex } from "knex";

/**
 * Migration: Add response column to contact_messages table
 *
 * This migration adds a text field to store the admin's response
 * to a contact message. This allows administrators to record
 * what they replied to the user.
 */

const CONTACT_MESSAGES_TABLE = "contact_messages";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn(CONTACT_MESSAGES_TABLE, "response");
  if (!hasColumn) {
    await knex.schema.alterTable(CONTACT_MESSAGES_TABLE, (table) => {
      table.text("response").nullable().comment("Admin's response text to this message");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn(CONTACT_MESSAGES_TABLE, "response");
  if (hasColumn) {
    await knex.schema.alterTable(CONTACT_MESSAGES_TABLE, (table) => {
      table.dropColumn("response");
    });
  }
}
