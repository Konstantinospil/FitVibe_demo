import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("user_contacts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("type").notNullable();
    table.specificType("value", "citext").notNullable();
    table.boolean("is_primary").notNullable().defaultTo(false);
    table.boolean("is_recovery").notNullable().defaultTo(false);
    table.boolean("is_verified").notNullable().defaultTo(false);
    table.timestamp("verified_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE user_contacts
    ADD CONSTRAINT user_contacts_type_check
    CHECK (type IN ('email', 'phone'))
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX idx_user_contacts_primary_email
    ON user_contacts (user_id)
    WHERE type = 'email' AND is_primary = true
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX idx_user_contacts_email_value
    ON user_contacts (value)
    WHERE type = 'email'
  `);

  await knex.schema.createTable("user_tombstones", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable();
    table.string("email_hash").notNullable();
    table.string("alias_hash").notNullable();
    table.timestamp("deleted_at", { useTz: true }).notNullable();
    table.timestamp("purged_at", { useTz: true }).nullable();
    table.timestamp("backup_purge_due_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["user_id"]);
    table.index(["email_hash"], "user_tombstones_email_hash_idx");
    table.index(["alias_hash"], "user_tombstones_alias_hash_idx");
  });

  await knex.schema.createTable("user_state_history", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("field").notNullable();
    table.jsonb("old_value").nullable();
    table.jsonb("new_value").nullable();
    table.timestamp("changed_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table
      .uuid("actor_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.uuid("request_id").nullable();
    table.index(["user_id", "changed_at"], "user_state_history_user_changed_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("user_state_history");
  await knex.schema.dropTableIfExists("user_tombstones");
  await knex.schema.dropTableIfExists("user_contacts");
}
