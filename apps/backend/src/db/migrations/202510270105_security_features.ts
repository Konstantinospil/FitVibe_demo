import type { Knex } from "knex";

/**
 * Migration: Security Features (2FA, Brute Force Protection, Personal Records)
 *
 * This migration adds critical security features identified in the implementation audit:
 * 1. Two-Factor Authentication (2FA) support via TOTP
 * 2. Brute force protection with progressive lockout
 * 3. Personal Records tracking for progress analytics
 *
 * Addresses audit findings:
 * - FR-1: Missing 2FA implementation
 * - FR-1: Missing brute force protection
 * - FR-5: Missing personal records API
 */

export async function up(knex: Knex): Promise<void> {
  // ========================================================================
  // 1. Two-Factor Authentication Tables
  // ========================================================================

  // User 2FA settings table
  await knex.schema.createTable("user_2fa_settings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    // TOTP secret (encrypted at application layer)
    table.text("totp_secret").notNullable();

    // Whether 2FA is enabled for this user
    table.boolean("is_enabled").notNullable().defaultTo(false);

    // Verification status (user must verify setup before enabling)
    table.boolean("is_verified").notNullable().defaultTo(false);

    // Backup email/phone for 2FA recovery
    table.text("recovery_email").nullable();
    table.text("recovery_phone").nullable();

    // Timestamps
    table.timestamp("enabled_at", { useTz: true }).nullable();
    table.timestamp("last_used_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Backup codes table (one-time use codes for 2FA recovery)
  await knex.schema.createTable("backup_codes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    // Hashed backup code (never store plaintext)
    table.text("code_hash").notNullable();

    // Whether this code has been used
    table.boolean("is_used").notNullable().defaultTo(false);

    // When the code was used
    table.timestamp("used_at", { useTz: true }).nullable();

    // Generation batch (allows invalidating all codes from a generation)
    table.integer("generation_batch").notNullable().defaultTo(1);

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Index for efficient lookups
    table.index(["user_id", "is_used"]);
  });

  // ========================================================================
  // 2. Brute Force Protection Table
  // ========================================================================

  await knex.schema.createTable("failed_login_attempts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    // Identifier (email or username) - not a foreign key as user may not exist
    table.text("identifier").notNullable();

    // IP address of the attempt
    table.text("ip_address").notNullable();

    // User agent
    table.text("user_agent").nullable();

    // Number of consecutive failed attempts
    table.integer("attempt_count").notNullable().defaultTo(1);

    // When the account is locked until (progressive lockout)
    table.timestamp("locked_until", { useTz: true }).nullable();

    // Last attempt timestamp
    table.timestamp("last_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // First attempt in this sequence
    table.timestamp("first_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Composite unique index on identifier + IP
    table.unique(["identifier", "ip_address"]);

    // Index for cleanup queries (remove old records)
    table.index("last_attempt_at");
  });

  // ========================================================================
  // 3. Personal Records Table
  // ========================================================================

  await knex.schema.createTable("personal_records", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    table
      .uuid("exercise_id")
      .notNullable()
      .references("id")
      .inTable("exercises")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");

    // PR type: '1rm' (one rep max), 'volume' (total volume), 'reps' (max reps at weight), 'duration' (max time)
    table.enu("pr_type", ["1rm", "volume", "reps", "duration"]).notNullable();

    // The value of the PR (weight in kg, reps, or duration in seconds)
    table.decimal("value", 10, 2).notNullable();

    // Additional context
    table.integer("reps").nullable(); // For 1RM calculation
    table.decimal("weight_kg", 10, 2).nullable(); // Weight used
    table.integer("duration_sec").nullable(); // Duration for time-based exercises

    // Reference to the session where this PR was achieved
    table
      .uuid("session_id")
      .nullable()
      .comment("FK to sessions(id) - enforced at application level per ADR-005");

    // Reference to the specific set where this PR was achieved
    table.uuid("set_id").nullable(); // Not enforcing FK to allow manual entry

    // Whether this is the current PR (only one per user/exercise/type)
    table.boolean("is_current").notNullable().defaultTo(true);

    // When this PR was achieved
    table.timestamp("achieved_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Notes about the PR
    table.text("notes").nullable();

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes for efficient queries
    table.index(["user_id", "exercise_id", "pr_type", "is_current"]);
    table.index(["user_id", "is_current"]);
    table.index("achieved_at");
  });

  // Add comment to document is_current flag behavior
  await knex.raw(`
    COMMENT ON COLUMN personal_records.is_current IS
    'Only one record per (user_id, exercise_id, pr_type) should have is_current=true. When a new PR is set, the previous current PR should be updated to is_current=false.';
  `);

  // ========================================================================
  // 4. Add Audit Log Events for Security Actions
  // ========================================================================

  // The audit_log table already exists, but let's document the new event types
  await knex.raw(`
    COMMENT ON TABLE audit_log IS
    'PII-free audit trail. New event types: 2fa_enabled, 2fa_disabled, 2fa_backup_codes_generated, account_locked, account_unlocked, personal_record_achieved';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists("personal_records");
  await knex.schema.dropTableIfExists("failed_login_attempts");
  await knex.schema.dropTableIfExists("backup_codes");
  await knex.schema.dropTableIfExists("user_2fa_settings");
}
