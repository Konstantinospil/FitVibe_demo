import type { Knex } from "knex";

const TABLE_NAME = "action_ui_mappings";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);
  if (!hasTable) {
    await knex.schema.createTable(TABLE_NAME, (table) => {
      table.string("action").primary();
      table.string("ui_name").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);
  if (hasTable) {
    await knex.schema.dropTable(TABLE_NAME);
  }
}
