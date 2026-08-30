import type { Knex } from "knex";

/**
 * Migration to add deactivated_at column to users table and create blacklist table
 *
 * This migration:
 * 1. Adds deactivated_at column to users table to track when a user was deactivated/banned
 * 2. Creates blacklist table to track banned emails with time periods
 * 3. Adds constraint to prevent overlapping ban periods for the same email
 */
export async function up(knex: Knex): Promise<void> {
  // Add deactivated_at column to users table
  if (await knex.schema.hasTable("users")) {
    const hasDeactivatedAt = await knex.schema.hasColumn("users", "deactivated_at");
    if (!hasDeactivatedAt) {
      await knex.schema.alterTable("users", (table) => {
        table
          .timestamp("deactivated_at", { useTz: true })
          .nullable()
          .comment("Date when user was deactivated/banned");
      });
    }
  }

  // Create blacklist table
  if (!(await knex.schema.hasTable("blacklist"))) {
    await knex.schema.createTable("blacklist", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.specificType("email", "citext").notNullable().comment("Banned email address");
      table
        .timestamp("active_from", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())
        .comment("Start date of the ban period");
      table
        .timestamp("active_to", { useTz: true })
        .nullable()
        .comment("End date of the ban period (null means permanent ban)");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table
        .uuid("created_by")
        .nullable()
        .references("id")
        .inTable("users")
        .onUpdate("CASCADE")
        .onDelete("SET NULL")
        .comment("Admin user who created this blacklist entry");

      // Index for efficient email lookups
      table.index("email");
      // Index for active ban lookups
      table.index(["email", "active_from", "active_to"]);
    });

    // Add constraint to prevent overlapping ban periods for the same email
    // We use a trigger-based approach since citext doesn't work with GIST exclusion constraints
    // The trigger validates that no overlapping ban periods exist for the same email
    // Two ranges [a1, a2) and [b1, b2) overlap if: a1 < b2 AND b1 < a2
    await knex.raw(`
      CREATE OR REPLACE FUNCTION check_no_overlapping_bans()
      RETURNS TRIGGER AS $$
      DECLARE
        overlapping_count INTEGER;
        current_id UUID;
      BEGIN
        -- Get the current row ID (for UPDATE) or use NEW.id (for INSERT)
        current_id := COALESCE(NEW.id, OLD.id);
        
        -- Check for overlapping ban periods for the same email
        -- Two periods [a1, a2) and [b1, b2) overlap if: a1 < b2 AND b1 < a2
        -- Where NULL active_to means infinity
        SELECT COUNT(*) INTO overlapping_count
        FROM blacklist
        WHERE email = NEW.email
          AND id != current_id
          AND NEW.active_from < COALESCE(active_to, 'infinity'::timestamptz)
          AND active_from < COALESCE(NEW.active_to, 'infinity'::timestamptz)
          AND (active_to IS NULL OR active_to > active_from);
        
        IF overlapping_count > 0 THEN
          RAISE EXCEPTION 'Overlapping ban period exists for email %', NEW.email;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
      CREATE TRIGGER blacklist_no_overlapping_bans_trigger
      BEFORE INSERT OR UPDATE ON blacklist
      FOR EACH ROW
      EXECUTE FUNCTION check_no_overlapping_bans();
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger and function
  await knex.raw(`
    DROP TRIGGER IF EXISTS blacklist_no_overlapping_bans_trigger ON blacklist;
    DROP FUNCTION IF EXISTS check_no_overlapping_bans();
  `);

  // Drop blacklist table
  if (await knex.schema.hasTable("blacklist")) {
    await knex.schema.dropTableIfExists("blacklist");
  }

  // Remove deactivated_at column from users table
  if (await knex.schema.hasTable("users")) {
    const hasDeactivatedAt = await knex.schema.hasColumn("users", "deactivated_at");
    if (hasDeactivatedAt) {
      await knex.schema.alterTable("users", (table) => {
        table.dropColumn("deactivated_at");
      });
    }
  }
}
