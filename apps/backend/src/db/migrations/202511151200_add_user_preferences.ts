import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    // Default session visibility preference (aligns with ADR-010)
    table
      .string("default_visibility")
      .notNullable()
      .defaultTo("private")
      .comment("Default visibility for new sessions: private, followers, link, or public");

    // Measurement units preference
    table
      .string("units")
      .notNullable()
      .defaultTo("metric")
      .comment("Preferred measurement units: metric or imperial");
  });

  // Add check constraints for valid values
  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_default_visibility_check
    CHECK (default_visibility IN ('private', 'followers', 'link', 'public'))
  `);

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_units_check
    CHECK (units IN ('metric', 'imperial'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("default_visibility");
    table.dropColumn("units");
  });
}
