import type { Knex } from "knex";
import knex from "knex";

import { DB_CONFIG } from "./db.config.js";
import { logger } from "../config/logger.js";

export const db: Knex = knex({
  client: "pg",
  connection: DB_CONFIG,
  pool: { min: 2, max: 10 },
  migrations: { tableName: "knex_migrations" },
});

export async function testConnection(): Promise<void> {
  try {
    await db.raw("SELECT 1 + 1 AS result");
    const sslInfo = DB_CONFIG.ssl
      ? `SSL enabled (rejectUnauthorized: ${DB_CONFIG.ssl.rejectUnauthorized})`
      : "SSL disabled";
    logger.info({ ssl: sslInfo }, "Database connection successful");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isSslError = errorMessage.includes("SSL") || errorMessage.includes("certificate");

    logger.error(
      {
        err: error,
        sslEnabled: !!DB_CONFIG.ssl,
        sslRejectUnauthorized: DB_CONFIG.ssl?.rejectUnauthorized,
        isSslError,
      },
      "Database connection failed",
    );

    if (isSslError) {
      logger.error(
        {
          hint: "Check SSL certificate configuration and PGSSL environment variables",
        },
        "SSL connection error detected",
      );
    }

    process.exit(1);
  }
}
