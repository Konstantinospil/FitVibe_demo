import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("auth_sessions", (table) => {
    table.uuid("jti").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("user_agent").nullable();
    table.specificType("ip", "inet").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table.timestamp("last_active_at", { useTz: true }).nullable();
    table.index(["user_id", "expires_at"], "auth_sessions_user_id_expires_idx");
  });

  await knex.schema.createTable("refresh_tokens", (table) => {
    table.uuid("id").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("session_jti")
      .notNullable()
      .references("jti")
      .inTable("auth_sessions")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("token_hash").notNullable().unique();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table.timestamp("rotated_at", { useTz: true }).nullable();
    table.index(["user_id", "session_jti"], "refresh_tokens_user_session_idx");
  });

  await knex.schema.createTable("auth_tokens", (table) => {
    table.uuid("id").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("token_type", 64).notNullable();
    table.string("token_hash").notNullable().unique();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("consumed_at", { useTz: true }).nullable();
    table.index(["token_type", "token_hash"], "auth_tokens_type_hash_idx");
    table.index(["created_at"], "auth_tokens_created_idx");
  });

  await knex.schema.createTable("pending_2fa_sessions", (table) => {
    table.uuid("id").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.text("ip").nullable();
    table.text("user_agent").nullable();
    table.boolean("verified").notNullable().defaultTo(false);
    table.index(["user_id"], "pending_2fa_sessions_user_idx");
    table.index(["expires_at"], "pending_2fa_sessions_expires_idx");
  });

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
    table.text("totp_secret").notNullable();
    table.boolean("is_enabled").notNullable().defaultTo(false);
    table.boolean("is_verified").notNullable().defaultTo(false);
    table.text("recovery_email").nullable();
    table.text("recovery_phone").nullable();
    table.timestamp("enabled_at", { useTz: true }).nullable();
    table.timestamp("last_used_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("backup_codes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.text("code_hash").notNullable();
    table.boolean("is_used").notNullable().defaultTo(false);
    table.timestamp("used_at", { useTz: true }).nullable();
    table.integer("generation_batch").notNullable().defaultTo(1);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "is_used"], "backup_codes_user_used_idx");
  });

  await knex.schema.createTable("failed_login_attempts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("identifier").notNullable();
    table.text("ip_address").notNullable();
    table.text("user_agent").nullable();
    table.integer("attempt_count").notNullable().defaultTo(1);
    table.timestamp("locked_until", { useTz: true }).nullable();
    table.timestamp("last_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("first_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["identifier", "ip_address"]);
    table.index(["last_attempt_at"], "failed_login_attempts_last_attempt_idx");
  });

  await knex.schema.createTable("failed_login_attempts_by_ip", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("ip_address").notNullable().unique();
    table.integer("distinct_email_count").notNullable().defaultTo(0);
    table.integer("total_attempt_count").notNullable().defaultTo(0);
    table.timestamp("locked_until", { useTz: true }).nullable();
    table.timestamp("last_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("first_attempt_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["last_attempt_at"], "failed_login_attempts_by_ip_last_attempt_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("failed_login_attempts_by_ip");
  await knex.schema.dropTableIfExists("failed_login_attempts");
  await knex.schema.dropTableIfExists("backup_codes");
  await knex.schema.dropTableIfExists("user_2fa_settings");
  await knex.schema.dropTableIfExists("pending_2fa_sessions");
  await knex.schema.dropTableIfExists("auth_tokens");
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("auth_sessions");
}
