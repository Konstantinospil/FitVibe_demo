import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("audit_log", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("actor_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("entity_type").notNullable();
    table.uuid("entity_id").nullable();
    table.string("action").notNullable();
    table.string("outcome").notNullable().defaultTo("success");
    table.uuid("request_id").nullable();
    table.jsonb("metadata").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`
    CREATE INDEX idx_audit_log_actor_recent
    ON audit_log (actor_user_id, created_at DESC)
    WHERE actor_user_id IS NOT NULL
  `);
  await knex.raw(`
    CREATE INDEX idx_audit_log_entity_recent
    ON audit_log (entity_type, entity_id, created_at DESC)
  `);

  await knex.schema.createTable("cookie_consents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.text("client_key").notNullable();
    table.string("consent_version", 50).notNullable();
    table.string("source").notNullable().defaultTo("banner");
    table.boolean("essential_cookies").notNullable().defaultTo(true);
    table.boolean("preferences_cookies").notNullable().defaultTo(false);
    table.boolean("analytics_cookies").notNullable().defaultTo(false);
    table.boolean("marketing_cookies").notNullable().defaultTo(false);
    table.timestamp("consent_given_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text("user_agent").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`
    CREATE INDEX idx_cookie_consents_user
    ON cookie_consents (user_id, consent_given_at DESC)
  `);
  await knex.raw(`
    CREATE INDEX idx_cookie_consents_client
    ON cookie_consents (client_key, consent_given_at DESC)
  `);

  await knex.schema.createTable("idempotency_keys", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("method", 16).notNullable();
    table.string("route", 255).notNullable();
    table.string("key", 255).notNullable();
    table.string("request_hash", 128).notNullable();
    table.integer("response_status");
    table.jsonb("response_body");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["user_id", "method", "route", "key"], "idx_idempotency_unique");
  });

  await knex.schema.createTable("blacklist", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.specificType("email", "citext").notNullable();
    table.timestamp("active_from", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("active_to", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table
      .uuid("created_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.index(["email"], "blacklist_email_idx");
  });
  await knex.raw(`
    CREATE OR REPLACE FUNCTION check_no_overlapping_bans()
    RETURNS TRIGGER AS $$
    DECLARE
      overlapping_count INTEGER;
      current_id UUID;
    BEGIN
      current_id := COALESCE(NEW.id, OLD.id);
      SELECT COUNT(*) INTO overlapping_count
      FROM blacklist
      WHERE email = NEW.email
        AND id != current_id
        AND NEW.active_from < COALESCE(active_to, 'infinity'::timestamptz)
        AND active_from < COALESCE(NEW.active_to, 'infinity'::timestamptz)
        AND (active_to IS NULL OR active_to > active_from);
      IF overlapping_count > 0 THEN
        RAISE EXCEPTION 'Overlapping ban period exists for email %', NEW.email;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`
    CREATE TRIGGER blacklist_no_overlapping_bans_trigger
    BEFORE INSERT OR UPDATE ON blacklist
    FOR EACH ROW
    EXECUTE FUNCTION check_no_overlapping_bans();
  `);

  await knex.schema.createTable("contact_messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("email").notNullable();
    table.string("topic").notNullable();
    table.text("message").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("read_at", { useTz: true }).nullable();
    table
      .uuid("read_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.timestamp("responded_at", { useTz: true }).nullable();
    table.text("response").nullable();
    table.index(["user_id"], "contact_messages_user_id_idx");
    table.index(["created_at"], "contact_messages_created_at_idx");
  });

  await knex.schema.createTable("translations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("namespace", 50).notNullable();
    table.text("key_path").notNullable();
    table.string("language", 10).notNullable();
    table.text("value").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deleted_at", { useTz: true }).nullable();
    table.uuid("created_by").nullable().references("id").inTable("users").onDelete("SET NULL");
    table.uuid("updated_by").nullable().references("id").inTable("users").onDelete("SET NULL");
  });
  await knex.raw(`
    CREATE UNIQUE INDEX idx_translations_namespace_key_lang_unique_active
    ON translations (namespace, key_path, language)
    WHERE deleted_at IS NULL
  `);
  await knex.raw(`
    CREATE INDEX idx_translations_lang_namespace
    ON translations (language, namespace)
  `);
  await knex.raw(`
    CREATE INDEX idx_translations_deleted_at
    ON translations (deleted_at)
    WHERE deleted_at IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("translations");
  await knex.schema.dropTableIfExists("contact_messages");
  await knex.raw(`
    DROP TRIGGER IF EXISTS blacklist_no_overlapping_bans_trigger ON blacklist;
    DROP FUNCTION IF EXISTS check_no_overlapping_bans();
  `);
  await knex.schema.dropTableIfExists("blacklist");
  await knex.schema.dropTableIfExists("idempotency_keys");
  await knex.schema.dropTableIfExists("cookie_consents");
  await knex.schema.dropTableIfExists("audit_log");
}
