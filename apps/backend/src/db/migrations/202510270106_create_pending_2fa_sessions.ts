import type { Knex } from "knex";

/**
 * Migration: Create pending_2fa_sessions table for 2-stage login
 *
 * This table stores temporary sessions for users who have completed
 * stage 1 authentication (email+password) but need to provide a 2FA
 * code before receiving full access tokens.
 *
 * Security considerations:
 * - Sessions expire after 5 minutes
 * - Can only be used once (verified flag)
 * - Tied to specific IP and user agent to prevent session hijacking
 * - Cleaned up by retention job
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("pending_2fa_sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.text("ip").nullable();
    table.text("user_agent").nullable();
    table.boolean("verified").notNullable().defaultTo(false);

    // Indexes for efficient lookups and cleanup
    table.index("user_id");
    table.index("expires_at");
    table.index(["id", "verified"]); // For lookup during verification
  });

  // Add comment for documentation
  await knex.raw(`
    COMMENT ON TABLE pending_2fa_sessions IS
    'Temporary sessions for 2-stage login flow when 2FA is enabled. Expires after 5 minutes.'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("pending_2fa_sessions");
}
