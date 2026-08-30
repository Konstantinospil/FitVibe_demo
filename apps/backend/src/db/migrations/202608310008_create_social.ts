import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("followers", (table) => {
    table
      .uuid("follower_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table
      .uuid("following_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["follower_id", "following_id"]);
  });
  await knex.raw(
    `ALTER TABLE followers ADD CONSTRAINT followers_no_self CHECK (follower_id <> following_id)`,
  );

  await knex.schema.createTable("feed_items", (table) => {
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
      .references("id")
      .inTable("sessions")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    table.string("visibility").notNullable().defaultTo("private");
    table.timestamp("published_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("deleted_at", { useTz: true }).nullable();
    table.index(["visibility", "published_at"], "idx_feed_items_visibility_published");
    table.index(["owner_id", "published_at"], "idx_feed_items_owner");
  });
  await knex.raw(`
    ALTER TABLE feed_items
    ADD CONSTRAINT feed_items_visibility_check
    CHECK (visibility IN ('private', 'followers', 'link', 'public'))
  `);

  await knex.schema.createTable("feed_likes", (table) => {
    table
      .uuid("feed_item_id")
      .notNullable()
      .references("id")
      .inTable("feed_items")
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
    table.index(["feed_item_id", "created_at"], "idx_feed_likes_item");
  });

  await knex.schema.createTable("session_bookmarks", (table) => {
    table
      .uuid("session_id")
      .notNullable()
      .references("id")
      .inTable("sessions")
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
    table.primary(["session_id", "user_id"]);
  });

  await knex.schema.createTable("feed_comments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("feed_item_id")
      .notNullable()
      .references("id")
      .inTable("feed_items")
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
      .inTable("feed_comments")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table.text("body").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("edited_at", { useTz: true }).nullable();
    table.timestamp("deleted_at", { useTz: true }).nullable();
    table.index(["feed_item_id", "created_at"], "idx_feed_comments_item");
  });

  await knex.schema.createTable("user_blocks", (table) => {
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
    table.primary(["blocker_id", "blocked_id"]);
    table.index(["blocker_id"], "user_blocks_blocker_idx");
    table.index(["blocked_id"], "user_blocks_blocked_idx");
  });
  await knex.raw(
    `ALTER TABLE user_blocks ADD CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)`,
  );

  await knex.schema.createTable("feed_reports", (table) => {
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
      .inTable("feed_items")
      .onUpdate("CASCADE")
      .onDelete("SET NULL");
    table
      .uuid("comment_id")
      .nullable()
      .references("id")
      .inTable("feed_comments")
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
    table.index(["feed_item_id", "status"], "feed_reports_item_idx");
    table.index(["comment_id", "status"], "feed_reports_comment_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("feed_reports");
  await knex.schema.dropTableIfExists("user_blocks");
  await knex.schema.dropTableIfExists("feed_comments");
  await knex.schema.dropTableIfExists("session_bookmarks");
  await knex.schema.dropTableIfExists("feed_likes");
  await knex.schema.dropTableIfExists("feed_items");
  await knex.schema.dropTableIfExists("followers");
}
