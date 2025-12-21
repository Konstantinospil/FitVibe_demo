import type { Knex } from "knex";

/**
 * Migration to create cookie_consents table for GDPR-compliant cookie consent management.
 * Stores consent preferences per IP address.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("cookie_consents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("ip_address").notNullable();
    table.string("consent_version", 50).notNullable(); // Policy version (e.g., "2024-06-01")
    table.boolean("essential_cookies").notNullable().defaultTo(true); // Always true, cannot be disabled
    table.boolean("preferences_cookies").notNullable().defaultTo(false);
    table.boolean("analytics_cookies").notNullable().defaultTo(false);
    table.boolean("marketing_cookies").notNullable().defaultTo(false);
    table.timestamp("consent_given_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("user_agent").nullable(); // Optional: for audit purposes
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Unique constraint on IP address (one consent record per IP)
    table.unique(["ip_address"], "cookie_consents_ip_unique");
    // Index for lookups
    table.index(["ip_address"], "idx_cookie_consents_ip");
    // Index for cleanup queries
    table.index(["last_updated_at"], "idx_cookie_consents_updated");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("cookie_consents");
}
