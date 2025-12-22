import type { Knex } from "knex";

const USERS_TABLE = "users";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.boolean("privacy_policy_accepted").defaultTo(false).notNullable();
    table.timestamp("privacy_policy_accepted_at", { useTz: true }).nullable();
    table.string("privacy_policy_version", 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(USERS_TABLE, (table) => {
    table.dropColumn("privacy_policy_accepted");
    table.dropColumn("privacy_policy_accepted_at");
    table.dropColumn("privacy_policy_version");
  });
}
