import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("display_name").notNullable();
    table.string("locale").notNullable().defaultTo("en-US");
    table.string("preferred_lang").notNullable().defaultTo("en");
    table.string("status").notNullable().defaultTo("active");
    table
      .string("role_code")
      .notNullable()
      .references("code")
      .inTable("roles")
      .onUpdate("CASCADE")
      .onDelete("RESTRICT");
    table.string("password_hash").notNullable();
    table
      .string("default_visibility")
      .notNullable()
      .defaultTo("private")
      .comment("Default visibility for new sessions");
    table.string("units").notNullable().defaultTo("metric").comment("metric or imperial");
    table.boolean("terms_accepted").notNullable().defaultTo(false);
    table.timestamp("terms_accepted_at", { useTz: true }).nullable();
    table.string("terms_version").nullable();
    table.boolean("privacy_policy_accepted").notNullable().defaultTo(false);
    table.timestamp("privacy_policy_accepted_at", { useTz: true }).nullable();
    table.string("privacy_policy_version").nullable();
    table.timestamp("purge_scheduled_at", { useTz: true }).nullable();
    table.timestamp("backup_purge_due_at", { useTz: true }).nullable();
    table.timestamp("deactivated_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deleted_at", { useTz: true }).nullable();
  });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_status_check
    CHECK (status IN ('active', 'pending_verification', 'pending_deletion', 'suspended', 'deleted'))
  `);
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_default_visibility_check
    CHECK (default_visibility IN ('private', 'followers', 'link', 'public'))
  `);
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_units_check
    CHECK (units IN ('metric', 'imperial'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
}
