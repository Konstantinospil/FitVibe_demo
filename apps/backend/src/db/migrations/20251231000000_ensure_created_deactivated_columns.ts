import type { Knex } from "knex";

const EXCLUDED_TABLES = new Set(["knex_migrations", "knex_migrations_lock"]);

async function listBaseTables(knex: Knex): Promise<string[]> {
  const result = await knex.raw<{
    rows: Array<{ table_name: string }>;
  }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
  `);

  return result.rows
    .map((row) => row.table_name)
    .filter((tableName) => !EXCLUDED_TABLES.has(tableName));
}

async function addColumnIfMissing(
  knex: Knex,
  tableName: string,
  columnName: string,
  builder: (table: Knex.AlterTableBuilder) => void,
): Promise<void> {
  const hasColumn = await knex.schema.hasColumn(tableName, columnName);
  if (!hasColumn) {
    await knex.schema.alterTable(tableName, builder);
  }
}

export async function up(knex: Knex): Promise<void> {
  const tables = await listBaseTables(knex);

  for (const tableName of tables) {
    await addColumnIfMissing(knex, tableName, "created_at", (table) => {
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    await addColumnIfMissing(knex, tableName, "deactivated_at", (table) => {
      table.timestamp("deactivated_at", { useTz: true }).nullable();
    });
  }
}

export async function down(): Promise<void> {
  // Irreversible migration: created_at/deactivated_at are now required across all tables.
}
