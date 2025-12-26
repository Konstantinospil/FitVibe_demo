import type { Knex } from "knex";

const FEED_ITEMS = "feed_items";
const FEED_LIKES = "feed_likes";
const SESSION_BOOKMARKS = "session_bookmarks";
const FEED_COMMENTS = "feed_comments";
const SHARE_LINKS = "share_links";
const FOLLOWERS = "followers";
const FEED_ITEMS_VISIBILITY_INDEX = "idx_feed_items_visibility_published";
const FEED_ITEMS_OWNER_INDEX = "idx_feed_items_owner";
const FEED_LIKES_ITEM_INDEX = "idx_feed_likes_item";
const FEED_COMMENTS_ITEM_INDEX = "idx_feed_comments_item";
const USER_BLOCKS = "user_blocks";
const USER_BLOCKS_PK = "user_blocks_pk";
const USER_BLOCKS_NO_SELF = "user_blocks_no_self";
const USER_BLOCKS_BLOCKER_INDEX = "user_blocks_blocker_idx";
const USER_BLOCKS_BLOCKED_INDEX = "user_blocks_blocked_idx";
const FEED_REPORTS = "feed_reports";
const FEED_REPORTS_ITEM_INDEX = "feed_reports_item_idx";
const FEED_REPORTS_COMMENT_INDEX = "feed_reports_comment_idx";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(FEED_ITEMS, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("owner_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("session_id")
      .nullable()
      .comment("FK to sessions(id) - enforced at application level per ADR-005");
    table.string("kind").notNullable().defaultTo("session");
    table.string("target_type").nullable();
    table.uuid("target_id").nullable();
    table.string("visibility").notNullable().defaultTo("private");
    table.decimal("score", 10, 2).notNullable().defaultTo(0);
    table.timestamp("published_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deleted_at", { useTz: true }).nullable();
  });

  await knex.schema.createTable(FEED_LIKES, (table) => {
    table
      .uuid("feed_item_id")
      .notNullable()
      .references("id")
      .inTable(FEED_ITEMS)
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["feed_item_id", "user_id"]);
  });

  await knex.schema.createTable(SESSION_BOOKMARKS, (table) => {
    table
      .uuid("session_id")
      .notNullable()
      .comment("FK to sessions(id) - enforced at application level per ADR-005");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["session_id", "user_id"]);
  });

  await knex.schema.createTable(FEED_COMMENTS, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("feed_item_id")
      .notNullable()
      .references("id")
      .inTable(FEED_ITEMS)
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("parent_id")
      .nullable()
      .references("id")
      .inTable(FEED_COMMENTS)
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.text("body").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("edited_at", { useTz: true }).nullable();
    table.timestamp("deleted_at", { useTz: true }).nullable();
  });

  await knex.schema.alterTable(SHARE_LINKS, (table) => {
    table
      .uuid("feed_item_id")
      .nullable()
      .references("id")
      .inTable(FEED_ITEMS)
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.uuid("session_id").nullable().alter();
  });

  const existingLinks = await knex<{ id: string; session_id: string | null }>(SHARE_LINKS).select([
    "id",
    "session_id",
  ]);
  for (const link of existingLinks) {
    if (!link.session_id) {
      continue;
    }
    const session = await knex("sessions")
      .select<{
        owner_id: string;
        completed_at: Date | string | null;
      }>(["owner_id", "completed_at"])
      .where({ id: link.session_id })
      .first();

    if (!session?.owner_id) {
      continue;
    }

    const feedItemResult = (await knex(FEED_ITEMS)
      .insert({
        owner_id: session.owner_id,
        session_id: link.session_id,
        kind: "session",
        target_type: "session",
        target_id: link.session_id,
        visibility: "link",
        published_at: session.completed_at ?? knex.fn.now(),
      })
      .returning("id")) as Array<{ id: string }>;
    const feedItem = feedItemResult[0];

    if (feedItem) {
      await knex(SHARE_LINKS).where({ id: link.id }).update({ feed_item_id: feedItem.id });
    }
  }

  await knex.raw(`
    ALTER TABLE ${SHARE_LINKS}
    ADD CONSTRAINT share_links_target_check
    CHECK (
      (feed_item_id IS NOT NULL AND session_id IS NULL)
      OR (session_id IS NOT NULL)
    )
  `);

  await knex.schema.alterTable(FOLLOWERS, (table) => {
    table.dropPrimary();
  });

  await knex.schema.alterTable(FOLLOWERS, (table) => {
    table.dropColumn("id");
  });

  await knex.raw(
    `ALTER TABLE ${FOLLOWERS} ADD CONSTRAINT followers_pk PRIMARY KEY (follower_id, following_id)`,
  );

  await knex.raw(
    `ALTER TABLE ${FOLLOWERS} ADD CONSTRAINT followers_no_self CHECK (follower_id <> following_id)`,
  );

  await knex.schema.alterTable(FEED_ITEMS, (table) => {
    table.index(["visibility", "published_at"], FEED_ITEMS_VISIBILITY_INDEX);
    table.index(["owner_id", "published_at"], FEED_ITEMS_OWNER_INDEX);
  });
  await knex.schema.alterTable(FEED_LIKES, (table) => {
    table.index(["feed_item_id", "created_at"], FEED_LIKES_ITEM_INDEX);
  });
  await knex.schema.alterTable(FEED_COMMENTS, (table) => {
    table.index(["feed_item_id", "created_at"], FEED_COMMENTS_ITEM_INDEX);
  });

  await knex.schema.createTable(USER_BLOCKS, (table) => {
    table
      .uuid("blocker_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("blocked_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["blocker_id", "blocked_id"], { constraintName: USER_BLOCKS_PK });
  });

  await knex.raw(
    `ALTER TABLE ${USER_BLOCKS} ADD CONSTRAINT ${USER_BLOCKS_NO_SELF} CHECK (blocker_id <> blocked_id)`,
  );

  await knex.schema.alterTable(USER_BLOCKS, (table) => {
    table.index(["blocker_id"], USER_BLOCKS_BLOCKER_INDEX);
    table.index(["blocked_id"], USER_BLOCKS_BLOCKED_INDEX);
  });

  await knex.schema.createTable(FEED_REPORTS, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("reporter_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("feed_item_id")
      .nullable()
      .references("id")
      .inTable(FEED_ITEMS)
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .uuid("comment_id")
      .nullable()
      .references("id")
      .inTable(FEED_COMMENTS)
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.string("reason").notNullable();
    table.text("details").nullable();
    table.string("status").notNullable().defaultTo("pending");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("resolved_at", { useTz: true }).nullable();
    table
      .uuid("resolved_by")
      .nullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
  });

  await knex.schema.alterTable(FEED_REPORTS, (table) => {
    table.index(["feed_item_id", "status"], FEED_REPORTS_ITEM_INDEX);
    table.index(["comment_id", "status"], FEED_REPORTS_COMMENT_INDEX);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(FEED_REPORTS, (table) => {
    table.dropIndex(["feed_item_id", "status"], FEED_REPORTS_ITEM_INDEX);
    table.dropIndex(["comment_id", "status"], FEED_REPORTS_COMMENT_INDEX);
  });
  await knex.schema.dropTableIfExists(FEED_REPORTS);

  await knex.schema.alterTable(USER_BLOCKS, (table) => {
    table.dropIndex(["blocked_id"], USER_BLOCKS_BLOCKED_INDEX);
    table.dropIndex(["blocker_id"], USER_BLOCKS_BLOCKER_INDEX);
  });
  await knex.raw(`ALTER TABLE ${USER_BLOCKS} DROP CONSTRAINT IF EXISTS ${USER_BLOCKS_NO_SELF}`);
  await knex.schema.dropTableIfExists(USER_BLOCKS);

  await knex.schema.alterTable(FEED_COMMENTS, (table) => {
    table.dropIndex(["feed_item_id", "created_at"], FEED_COMMENTS_ITEM_INDEX);
  });
  await knex.schema.alterTable(FEED_LIKES, (table) => {
    table.dropIndex(["feed_item_id", "created_at"], FEED_LIKES_ITEM_INDEX);
  });
  await knex.schema.alterTable(FEED_ITEMS, (table) => {
    table.dropIndex(["visibility", "published_at"], FEED_ITEMS_VISIBILITY_INDEX);
    table.dropIndex(["owner_id", "published_at"], FEED_ITEMS_OWNER_INDEX);
  });

  await knex.raw(`ALTER TABLE ${FOLLOWERS} DROP CONSTRAINT IF EXISTS followers_no_self`);
  await knex.raw(`ALTER TABLE ${FOLLOWERS} DROP CONSTRAINT IF EXISTS followers_pk`);
  await knex.schema.alterTable(FOLLOWERS, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
  });

  await knex.raw(`ALTER TABLE ${SHARE_LINKS} DROP CONSTRAINT IF EXISTS share_links_target_check`);

  // Check if share_links table exists before trying to alter it
  // This handles the case where the table was dropped/recreated during rollback
  const shareLinksExists = await knex.schema.hasTable(SHARE_LINKS);
  if (shareLinksExists) {
    // Check if column exists using parameterized query to prevent SQL injection
    const columnExistsResult = await knex.raw<{ rows: Array<{ exists: boolean }> }>(
      `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = ? AND column_name = ?
      ) as exists
    `,
      [SHARE_LINKS, "feed_item_id"],
    );
    const columnExists = (columnExistsResult as { rows: Array<{ exists: boolean }> }).rows[0]
      ?.exists;

    if (columnExists) {
      // Use PostgreSQL's format() function to construct the DO block with safely escaped values
      // %L safely escapes literal values, %I safely quotes identifiers
      // This prevents SQL injection by using proper escaping instead of string interpolation
      const doBlockResult = await knex.raw<{ rows: Array<{ sql: string }> }>(
        `SELECT format($sql$DO $$ BEGIN EXECUTE format('ALTER TABLE %%I DROP COLUMN %%I', %L, %L); END $$;$sql$, ?, ?) as sql`,
        [SHARE_LINKS, "feed_item_id"],
      );
      const doBlockSql = (doBlockResult as { rows: Array<{ sql: string }> }).rows[0]?.sql;
      if (doBlockSql) {
        await knex.raw(doBlockSql);
      }
    }

    // Restore session_id to not nullable (original state from migration 202510260104)
    // This is safe even if the column is already not nullable
    await knex.schema.alterTable(SHARE_LINKS, (table) => {
      table.uuid("session_id").notNullable().alter();
    });
  }

  await knex.schema.dropTableIfExists(FEED_COMMENTS);
  await knex.schema.dropTableIfExists(SESSION_BOOKMARKS);
  await knex.schema.dropTableIfExists(FEED_LIKES);
  await knex.schema.dropTableIfExists(FEED_ITEMS);
}
