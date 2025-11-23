import type { Knex } from "knex";

const USERS_TABLE = "users";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.boolean("terms_accepted").defaultTo(false).notNullable();
    table.timestamp("terms_accepted_at", { useTz: true }).nullable();
    table.string("terms_version", 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.dropColumn("terms_accepted");
    table.dropColumn("terms_accepted_at");
    table.dropColumn("terms_version");
  });
}
