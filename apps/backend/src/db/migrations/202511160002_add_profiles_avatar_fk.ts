import type { Knex } from "knex";

/**
 * Migration to add foreign key constraint for profiles.avatar_asset_id → media.id
 * This is deferred until after media table exists.
 * Note: This migration assumes media table already exists (created in 202510140020).
 */
export async function up(knex: Knex): Promise<void> {
  // Check if media table exists before adding FK
  const tableExists = await knex.schema.hasTable("media");
  if (!tableExists) {
    // If media doesn't exist yet, skip FK creation
    // It will be added in a later migration after media is created
    return;
  }

  // Add foreign key constraint
  await knex.schema.alterTable("profiles", (table) => {
    table
      .foreign("avatar_asset_id")
      .references("id")
      .inTable("media")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop foreign key constraint
  await knex.schema.alterTable("profiles", (table) => {
    table.dropForeign("avatar_asset_id");
  });
}
