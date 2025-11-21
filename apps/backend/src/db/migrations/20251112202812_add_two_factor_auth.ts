import type { Knex } from "knex";

/**
 * Add two-factor authentication (2FA) support
 * Includes TOTP secrets, backup codes, and audit trail
 */
export async function up(knex: Knex): Promise<void> {
  // Add 2FA columns to users table
  await knex.schema.alterTable("users", (table) => {
    table.boolean("two_factor_enabled").notNullable().defaultTo(false);
    table.text("two_factor_secret").nullable(); // TOTP secret (encrypted)
    table.timestamp("two_factor_enabled_at").nullable();
  });

  // Create backup codes table
  await knex.schema.createTable("two_factor_backup_codes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.text("code_hash").notNullable(); // Hashed backup code
    table.boolean("used").notNullable().defaultTo(false);
    table.timestamp("used_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index(["user_id", "used"]);
  });

  // Create 2FA audit log table
  await knex.schema.createTable("two_factor_audit_log", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table
      .enu("event_type", [
        "enabled",
        "disabled",
        "verified",
        "failed_verification",
        "backup_code_used",
        "backup_codes_regenerated",
      ])
      .notNullable();
    table.text("ip_address").nullable();
    table.text("user_agent").nullable();
    table.jsonb("metadata").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("created_at");
    table.index(["user_id", "event_type"]);
  });

  // Add comment for security best practices
  await knex.raw(`
    COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret - must be encrypted at rest';
    COMMENT ON COLUMN two_factor_backup_codes.code_hash IS 'Hashed backup code using bcrypt';
    COMMENT ON TABLE two_factor_audit_log IS 'Audit trail for 2FA events - PII-free';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("two_factor_audit_log");
  await knex.schema.dropTableIfExists("two_factor_backup_codes");

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("two_factor_enabled");
    table.dropColumn("two_factor_secret");
    table.dropColumn("two_factor_enabled_at");
  });
}
