import db from "../index.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";

async function main(): Promise<void> {
  try {
    logger.info("[db] Applying migrations (all environments)...");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await db.migrate.latest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const batchNo = result[0] as number;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const migrations = result[1] as Array<{ name: string }>;

    if (migrations.length > 0) {
      logger.info(`[db] Applied ${migrations.length} migration(s) in batch ${batchNo}:`, {
        migrations: migrations.map((m) => m.name),
      });
    } else {
      logger.info("[db] No new migrations to apply.");
    }
    logger.info("[db] Migrations applied successfully.");
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  logger.error(toErrorPayload(error), "Failed to apply migrations.");
  process.exit(1);
});
