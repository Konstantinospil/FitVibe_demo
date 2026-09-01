import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.boolean("allow_followers").notNullable().defaultTo(true);
    table.boolean("show_email").notNullable().defaultTo(false);
    table.boolean("show_weight").notNullable().defaultTo(false);
    table.boolean("show_fitness_level").notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("allow_followers");
    table.dropColumn("show_email");
    table.dropColumn("show_weight");
    table.dropColumn("show_fitness_level");
  });
}
