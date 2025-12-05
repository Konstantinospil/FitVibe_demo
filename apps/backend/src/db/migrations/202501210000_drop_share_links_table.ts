import type { Knex } from "knex";

const TABLE = "share_links";
const SHARE_LINK_TOKEN_UNIQUE = "share_links_token_unique";
const SHARE_LINK_SESSION_INDEX = "share_links_session_idx";

/**
 * Migration: Drop share_links table
 *
 * This migration removes the share_links table and related indexes/constraints
 * as part of removing share link functionality per ADR-0021 (Auth-Wall).
 *
 * Share links are no longer supported - all content requires authentication.
 */
export async function up(knex: Knex): Promise<void> {
  // Drop indexes first (using raw SQL to handle IF EXISTS)
  await knex.raw(`DROP INDEX IF EXISTS ${SHARE_LINK_SESSION_INDEX};`);

  // Drop the table (this will also drop the unique constraint on token)
  await knex.schema.dropTableIfExists(TABLE);
}

export async function down(knex: Knex): Promise<void> {
  // Recreate the table structure (for rollback purposes)
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

  await knex.schema.alterTable(TABLE, (table) => {
    table.index(["session_id"], SHARE_LINK_SESSION_INDEX);
  });
}
