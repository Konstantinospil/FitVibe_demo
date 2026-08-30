import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("roles", (table) => {
    table.string("code").primary();
    table.string("description").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("genders", (table) => {
    table.string("code").primary();
    table.string("description").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("fitness_levels", (table) => {
    table.string("code").primary();
    table.string("description").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("exercise_types", (table) => {
    table.string("code").primary();
    table.string("description").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("exercise_types");
  await knex.schema.dropTableIfExists("fitness_levels");
  await knex.schema.dropTableIfExists("genders");
  await knex.schema.dropTableIfExists("roles");
}
