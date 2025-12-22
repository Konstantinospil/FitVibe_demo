import type { Knex } from "knex";

const TRANSLATIONS_TABLE = "translations";
const IDX_TRANSLATIONS_LOOKUP = "idx_translations_lang_namespace";
const IDX_TRANSLATIONS_KEY = "idx_translations_key_path";
const UNIQUE_TRANSLATION_KEY = "translations_namespace_key_lang_unique";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TRANSLATIONS_TABLE, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .string("namespace", 50)
      .notNullable()
      .comment("Translation namespace: 'common', 'auth', 'terms', etc.");
    table
      .text("key_path")
      .notNullable()
      .comment("Nested key path: 'title', 'errors.invalid', 'home.subtitle'");
    table
      .string("language", 10)
      .notNullable()
      .comment("Language code: 'en', 'de', 'fr', 'es', 'el'");
    table.text("value").notNullable().comment("Translation value");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table
      .uuid("created_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .comment("User who created this translation");
    table
      .uuid("updated_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL")
      .comment("User who last updated this translation");
  });

  // Create unique constraint for namespace + key_path + language
  await knex.raw(`
    ALTER TABLE ${TRANSLATIONS_TABLE}
    ADD CONSTRAINT ${UNIQUE_TRANSLATION_KEY}
    UNIQUE (namespace, key_path, language)
  `);

  // Create indexes for efficient lookups
  await knex.raw(`
    CREATE INDEX ${IDX_TRANSLATIONS_LOOKUP}
    ON ${TRANSLATIONS_TABLE} (language, namespace)
  `);

  await knex.raw(`
    CREATE INDEX ${IDX_TRANSLATIONS_KEY}
    ON ${TRANSLATIONS_TABLE} (key_path)
  `);

  // Add trigger to update updated_at timestamp
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_translations_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_translations_updated_at
    BEFORE UPDATE ON ${TRANSLATIONS_TABLE}
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TRIGGER IF EXISTS trg_translations_updated_at ON ${TRANSLATIONS_TABLE}`);
  await knex.raw(`DROP FUNCTION IF EXISTS update_translations_updated_at()`);
  await knex.raw(`DROP INDEX IF EXISTS ${IDX_TRANSLATIONS_KEY}`);
  await knex.raw(`DROP INDEX IF EXISTS ${IDX_TRANSLATIONS_LOOKUP}`);
  await knex.schema.dropTableIfExists(TRANSLATIONS_TABLE);
}
