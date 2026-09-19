import type { Knex } from "knex";

const TABLE_NAME = "user_vibeform_preferences";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table
      .uuid("user_id")
      .primary()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("template_code", 80).notNullable().defaultTo("flow");
    table.smallint("template_version").notNullable().defaultTo(1);
    table.string("body_profile", 32).notNullable().defaultTo("balanced");
    table.boolean("motion_enabled").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE ${TABLE_NAME}
    ADD CONSTRAINT user_vibeform_preferences_template_code_check
    CHECK (char_length(trim(template_code)) > 0)
  `);
  await knex.raw(`
    ALTER TABLE ${TABLE_NAME}
    ADD CONSTRAINT user_vibeform_preferences_template_version_check
    CHECK (template_version > 0)
  `);
  await knex.raw(`
    ALTER TABLE ${TABLE_NAME}
    ADD CONSTRAINT user_vibeform_preferences_body_profile_check
    CHECK (body_profile IN ('shoulder-dominant', 'balanced', 'hip-dominant'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TABLE_NAME);
}
