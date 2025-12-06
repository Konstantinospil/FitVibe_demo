import type { Knex } from "knex";

const TABLE = "share_links";
const SHARE_LINK_SESSION_INDEX = "share_links_session_idx";
const SHARE_LINK_TOKEN_UNIQUE = "share_links_token_unique";

/**
 * Migration to drop share_links table per ADR-0021 and FR-003 requirement.
 * Share link functionality has been completely removed from the codebase.
 */
export async function up(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.schema.alterTable(TABLE, (table) => {
    table.dropIndex(["session_id"], SHARE_LINK_SESSION_INDEX);
  });

  // Drop unique constraint
  await knex.raw(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS ${SHARE_LINK_TOKEN_UNIQUE}`);

  // Drop check constraint if it exists
  await knex.raw(`ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS share_links_target_check`);

  // Drop the table
  await knex.schema.dropTableIfExists(TABLE);
}

export async function down(knex: Knex): Promise<void> {
  // Recreate the table (for rollback purposes)
  await knex.schema.createTable(TABLE, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("session_id")
      .nullable()
      .comment("FK to sessions(id) - enforced at application level per ADR-005");
    table
      .uuid("feed_item_id")
      .nullable()
      .references("id")
      .inTable("feed_items")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("token").notNullable().unique(SHARE_LINK_TOKEN_UNIQUE);
    table.integer("view_count").notNullable().defaultTo(0);
    table.integer("max_views").nullable();
    table.timestamp("expires_at", { useTz: true }).nullable();
    table.timestamp("revoked_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid("created_by").notNullable().references("id").inTable("users").onDelete("CASCADE");

    // Check constraint
    table.check(
      "((feed_item_id IS NOT NULL AND session_id IS NULL) OR (session_id IS NOT NULL))",
      [],
      "share_links_target_check",
    );
  });

  // Recreate index
  await knex.schema.alterTable(TABLE, (table) => {
    table.index(["session_id"], SHARE_LINK_SESSION_INDEX);
  });
}
