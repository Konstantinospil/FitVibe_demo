import db from "../index.js";
import { logger } from "../../config/logger.js";
import { toErrorPayload } from "../../utils/error.utils.js";

async function main(): Promise<void> {
  logger.info("Sessions and points use simple primary keys; no monthly partitions to rotate.");
  await db.raw("SELECT public.refresh_session_summary(TRUE);");
  logger.info("Refreshed session_summary and weekly_aggregates.");
}

main()
  .then(() => db.destroy())
  .catch((error: unknown) => {
    logger.error(toErrorPayload(error), "Failed to refresh progress views");
    return db.destroy().finally(() => process.exit(1));
  });
