import type { Knex } from "knex";

/**
 * Migration: Add responded_at column to contact_messages table
 *
 * No-op: responded_at and contact_messages_responded_at_idx are already
 * created in 202510140029_create_contact_messages_table.ts. This migration
 * is kept for compatibility with existing migration history only.
 */

export async function up(_knex: Knex): Promise<void> {
  // No-op: column and index exist from initial table creation
}

export async function down(_knex: Knex): Promise<void> {
  // No-op: do not drop column/index that belong to initial table creation
}
