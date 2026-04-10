import type { Knex } from "knex";

/**
 * Migration: Add response column to contact_messages table
 *
 * No-op: response column is already created in
 * 202510140029_create_contact_messages_table.ts. This migration
 * is kept for compatibility with existing migration history only.
 */

export async function up(_knex: Knex): Promise<void> {
  // No-op: column exists from initial table creation
}

export async function down(_knex: Knex): Promise<void> {
  // No-op: do not drop column that belongs to initial table creation
}
