import type { Knex } from "knex";

/**
 * Migration: IP-Based Brute Force Protection
 *
 * This migration adds IP-based brute force protection to prevent attackers
 * from bypassing account-level protection by trying different email addresses
 * from the same IP address.
 *
 * Addresses security requirement:
 * - NFR-001: Security - Brute force protection on auth endpoints
 * - Prevents IP-based enumeration attacks across multiple accounts
 */

export async function up(knex: Knex): Promise<void> {
  // ========================================================================
  // IP-Based Brute Force Protection Table
  // ========================================================================

  await knex.schema.createTable("failed_login_attempts_by_ip", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    // IP address of the attempt (unique per IP)
    table.text("ip_address").notNullable().unique();

    // Number of distinct email addresses attempted from this IP
    table.integer("distinct_email_count").notNullable().defaultTo(0);

    // Total number of failed login attempts from this IP
    table.integer("total_attempt_count").notNullable().defaultTo(0);

    // When the IP is locked until (progressive lockout)
    table.timestamp("locked_until", { useTz: true }).nullable();

    // Last attempt timestamp
    table.timestamp("last_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // First attempt in this sequence
    table.timestamp("first_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Index for cleanup queries (remove old records)
    table.index("last_attempt_at");
    table.index("ip_address");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("failed_login_attempts_by_ip");
}
