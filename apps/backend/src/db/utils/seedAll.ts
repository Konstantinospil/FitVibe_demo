import db from "../index.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";
import { up as ensureExtensions } from "../migrations/202510140001_enable_extensions.js";
import { up as ensureUsernameColumnExists } from "../migrations/202511170000_ensure_username_column_exists.js";

async function main(): Promise<void> {
  try {
    logger.info("[db] Applying migrations before seeding...");
    await db.migrate.latest();
    logger.info("[db] Migrations applied.");

    const hasUsersTable = await db.schema.hasTable("users");
    if (hasUsersTable) {
      const hasUsernameColumn = await db.schema.hasColumn("users", "username");
      if (!hasUsernameColumn) {
        logger.warn("[db] users.username missing; applying corrective migration.");

        const typeCheck = await db.raw<{ rows?: Array<Record<string, unknown>> }>(`
          SELECT 1
          FROM pg_type
          WHERE typname = 'citext'
        `);
        const typeRows = typeCheck.rows ?? [];
        if (typeRows.length === 0) {
          logger.warn("[db] citext type missing; enabling extensions.");
          await ensureExtensions(db);
        }

        await ensureUsernameColumnExists(db);
      }
    }

    logger.info("[db] Running database seeds...");

    const result = await db.seed.run();

    const seedFiles = result[0];

    if (seedFiles.length > 0) {
      logger.info(
        {
          seeds: seedFiles,
        },
        `[db] Applied ${seedFiles.length} seed file(s):`,
      );
    } else {
      logger.info("[db] No new seeds to apply.");
    }

    // Verify critical seed data was inserted
    const criticalSeeds = [
      { table: "roles", minCount: 4 },
      { table: "genders", minCount: 4 },
      { table: "fitness_levels", minCount: 4 },
      { table: "exercise_types", minCount: 20 },
    ];

    for (const { table, minCount } of criticalSeeds) {
      const exists = await db.schema.hasTable(table);
      if (exists) {
        const count = await db(table).count<{ count: string | number }>("* as count").first();
        const rowCount = count ? Number(count.count) : 0;
        if (rowCount < minCount) {
          throw new Error(
            `Seed verification failed: ${table} has ${rowCount} rows, expected at least ${minCount}`,
          );
        }
        logger.info(`[db] Verified ${table}: ${rowCount} rows`);
      }
    }
    logger.info("[db] Seeds completed and verified.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        ...toErrorPayload(error),
        context: "seedAll",
      },
      `Failed to run database seeds: ${errorMessage}`,
    );
    throw error;
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  logger.error(toErrorPayload(error), "Failed to run database seeds.");
  process.exit(1);
});
