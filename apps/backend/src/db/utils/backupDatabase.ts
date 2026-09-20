import { spawnSync } from "child_process";
import { logger } from "../../config/logger.js";
import { DB_CONFIG } from "../db.config.js";

interface BackupConnection {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

function resolveBackupConnection(): BackupConnection {
  if (DB_CONFIG.connectionString) {
    const url = new URL(DB_CONFIG.connectionString);
    const database = url.pathname.replace(/^\//, "");
    if (!url.hostname || !url.username || !database) {
      throw new Error("DATABASE_URL must include host, username, and database for backups");
    }

    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      user: decodeURIComponent(url.username),
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database,
    };
  }

  if (!DB_CONFIG.host || !DB_CONFIG.port || !DB_CONFIG.user || !DB_CONFIG.database) {
    throw new Error("Database host, port, user, and database are required for backups");
  }

  return {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
  };
}

const connection = resolveBackupConnection();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `backup_${connection.database}_${timestamp}.sql`;

logger.info(`Creating database backup: ${file}`);

const result = spawnSync(
  "pg_dump",
  [
    `--host=${connection.host}`,
    `--port=${connection.port}`,
    `--username=${connection.user}`,
    "--no-password",
    "--format=p",
    `--file=${file}`,
    connection.database,
  ],
  {
    stdio: "inherit",
    env: connection.password ? { ...process.env, PGPASSWORD: connection.password } : process.env,
  },
);

if ((result.status ?? 1) === 0) {
  logger.info("Backup completed successfully.");
} else {
  logger.error("Backup failed.");
  process.exit(result.status ?? 1);
}
