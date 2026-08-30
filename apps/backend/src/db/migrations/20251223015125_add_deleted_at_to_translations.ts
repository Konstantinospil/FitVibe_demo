import type { Knex } from "knex";

const TRANSLATIONS_TABLE = "translations";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TRANSLATIONS_TABLE, (table) => {
    table.timestamp("deleted_at", { useTz: true }).nullable().comment("Soft delete timestamp");
  });

  // Create index for filtering active translations
  await knex.raw(`
    CREATE INDEX idx_translations_deleted_at
    ON ${TRANSLATIONS_TABLE} (deleted_at)
    WHERE deleted_at IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_translations_deleted_at`);
  await knex.schema.alterTable(TRANSLATIONS_TABLE, (table) => {
    table.dropColumn("deleted_at");
  });
}
