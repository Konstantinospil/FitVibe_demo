import db from "../index.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";

const REQUIRED_SEED_COUNTS = [
  { table: "roles", minCount: 4 },
  { table: "genders", minCount: 4 },
  { table: "fitness_levels", minCount: 5 },
  { table: "exercise_types", minCount: 24 },
  { table: "exercises", minCount: 300 },
  { table: "badge_catalog", minCount: 36 },
  { table: "bio_attributes", minCount: 11 },
  { table: "perf_attributes", minCount: 12 },
  { table: "translations", minCount: 1 },
] as const;

/**
 * Runs the production-safe top-level database seeds and verifies that required
 * reference/catalog data is present. Demo fixtures live under "Demo Data" and
 * are not part of the configured top-level seed run.
 */
export async function seedAll(): Promise<void> {
  try {
    logger.info("[db] Running production-safe database seeds...");

    const result = await db.seed.run();
    const seedFiles = result[0];

    if (seedFiles.length > 0) {
      logger.info({ seeds: seedFiles }, `[db] Applied ${seedFiles.length} seed file(s):`);
    } else {
      logger.info("[db] No seed files were applied.");
    }

    for (const { table, minCount } of REQUIRED_SEED_COUNTS) {
      const exists = await db.schema.hasTable(table);
      if (!exists) {
        throw new Error(`Seed verification failed: required table ${table} is missing`);
      }

      const count = await db(table).count<{ count: string | number }>("* as count").first();
      const rowCount = count ? Number(count.count) : 0;
      if (rowCount < minCount) {
        throw new Error(
          `Seed verification failed: ${table} has ${rowCount} rows, expected at least ${minCount}`,
        );
      }
      logger.info(`[db] Verified ${table}: ${rowCount} rows`);
    }

    logger.info("[db] Production-safe seeds completed and verified.");
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

if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
  seedAll().catch((error: unknown) => {
    logger.error(toErrorPayload(error), "Failed to run database seeds.");
    process.exit(1);
  });
}
