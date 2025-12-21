import type { Knex } from "knex";

const TABLE = "share_links";
const SHARE_LINK_SESSION_INDEX = "share_links_session_idx";
const SHARE_LINK_TOKEN_UNIQUE = "share_links_token_unique";

/**
 * Migration to drop share_links table per ADR-0021 and FR-003 requirement.
 * Share link functionality has been completely removed from the codebase.
 */
export async function up(knex: Knex): Promise<void> {
  // Check if table exists before trying to drop indexes
  const tableExists = await knex.schema.hasTable(TABLE);
  if (!tableExists) {
    return; // Table doesn't exist, nothing to drop
  }

  // Drop indexes first (use raw SQL with IF EXISTS for safety)
  try {
    await knex.raw(`DROP INDEX IF EXISTS ${SHARE_LINK_SESSION_INDEX}`);
  } catch (error) {
    // Index might not exist, continue
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("does not exist")) {
      throw error;
    }
  }

  // Drop unique constraint
  await knex.raw(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS ${SHARE_LINK_TOKEN_UNIQUE}`);

  // Drop check constraint if it exists
  await knex.raw(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS share_links_target_check`);

  // Drop the table
  await knex.schema.dropTableIfExists(TABLE);
}

export async function down(knex: Knex): Promise<void> {
  // Recreate the table in its ORIGINAL state (from migration 202510260104)
  // This matches the schema before migration 202510260105 enhanced it with feed_item_id support.
  // Migration 202510260105's down() will handle reverting the enhanced features if needed.
  await knex.schema.createTable(TABLE, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("session_id")
      .notNullable()
      .comment("FK to sessions(id) - enforced at application level per ADR-005");
    table.string("token").notNullable().unique(SHARE_LINK_TOKEN_UNIQUE);
    table.integer("view_count").notNullable().defaultTo(0);
    table.integer("max_views").nullable();
    table.timestamp("expires_at", { useTz: true }).nullable();
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid("created_by").notNullable().references("id").inTable("users").onDelete("CASCADE");
  });

  // Recreate index
  await knex.schema.alterTable(TABLE, (table) => {
    table.index(["session_id"], SHARE_LINK_SESSION_INDEX);
  });
}
