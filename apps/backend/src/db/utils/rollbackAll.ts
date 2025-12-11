import db from "../index.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";

async function main(): Promise<void> {
  try {
    logger.info("[db] Rolling back all migrations...");

    // Get current migration state before rollback
    const beforeRollback = await db.migrate.currentVersion();
    logger.info(`[db] Current migration version before rollback: ${beforeRollback || "none"}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await db.migrate.rollback(undefined, true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const rolledBackMigrations = result[0] as Array<{ name: string }>;

    if (rolledBackMigrations.length > 0) {
      logger.info(
        {
          migrations: rolledBackMigrations.map((m) => m.name),
        },
        `[db] Rolled back ${rolledBackMigrations.length} migration(s):`,
      );
    } else {
      logger.info("[db] No migrations to roll back.");
    }

    // Verify rollback state
    const afterRollback = await db.migrate.currentVersion();
    logger.info(`[db] Migration version after rollback: ${afterRollback || "none"}`);

    // Verify that migration table reflects the rollback
    const migrationTableExists = await db.schema.hasTable("knex_migrations");
    if (migrationTableExists) {
      const migrationCount = await db("knex_migrations")
        .count<{ count: string | number }>("* as count")
        .first();
      const count = migrationCount ? Number(migrationCount.count) : 0;
      logger.info(`[db] Migration table has ${count} recorded migration(s)`);
    }

    logger.info("[db] Rollback completed and verified.");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        ...toErrorPayload(error),
        context: "rollbackAll",
      },
      `Failed to roll back migrations: ${errorMessage}`,
    );
    throw error;
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  logger.error(toErrorPayload(error), "Failed to roll back migrations.");
  process.exit(1);
});
