import type { Knex } from "knex";

/**
 * Migration: Add responded_at column to contact_messages table
 *
 * This migration adds a timestamp field to track when a reply was sent
 * to a contact message. This allows administrators to see when they
 * last responded to a user inquiry.
 */

const CONTACT_MESSAGES_TABLE = "contact_messages";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn(CONTACT_MESSAGES_TABLE, "responded_at");

  if (!hasColumn) {
    await knex.schema.alterTable(CONTACT_MESSAGES_TABLE, (table) => {
      table
        .timestamp("responded_at", { useTz: true })
        .nullable()
        .comment("Timestamp when admin replied to this message");
    });
  }

  // Add index for querying messages by response status (idempotent for Postgres).
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS contact_messages_responded_at_idx ON ${CONTACT_MESSAGES_TABLE} (responded_at);`,
  );
}

export async function down(knex: Knex): Promise<void> {
  // Drop index first
  await knex.raw(`DROP INDEX IF EXISTS contact_messages_responded_at_idx;`);

  // Drop column
  const hasColumn = await knex.schema.hasColumn(CONTACT_MESSAGES_TABLE, "responded_at");

  if (hasColumn) {
    await knex.schema.alterTable(CONTACT_MESSAGES_TABLE, (table) => {
      table.dropColumn("responded_at");
    });
  }
}
