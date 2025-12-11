import type { Knex } from "knex";
import fs from "node:fs";
import path from "node:path";

function readSql(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

/**
 * Migration to install/update the audit trigger for sessions table.
 * This trigger automatically logs INSERT, UPDATE, and DELETE operations on sessions
 * to the audit_log table.
 *
 * Fixed: Changed from NEW.user_id to NEW.owner_id to match the sessions table schema.
 */
export async function up(knex: Knex): Promise<void> {
  // Install the audit trigger for sessions table
  await knex.raw(readSql("../triggers/t_audit_sessions.sql"));
}

export async function down(knex: Knex): Promise<void> {
  // Drop the trigger and function
  await knex.raw("DROP TRIGGER IF EXISTS trg_audit_sessions ON sessions CASCADE;");
  await knex.raw("DROP FUNCTION IF EXISTS public.audit_sessions_trigger() CASCADE;");
}
