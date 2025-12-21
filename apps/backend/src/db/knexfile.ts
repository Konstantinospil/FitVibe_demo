import * as dotenv from "dotenv";
import type { Knex } from "knex";
import * as path from "node:path";

dotenv.config();

const baseDir = path.resolve(__dirname, "..");
const migrationsDir = path.resolve(baseDir, "db", "migrations");
const seedsDir = path.resolve(baseDir, "db", "seeds");

const shared: Partial<Knex.Config> = {
  client: "pg",
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: "knex_migrations",
    extension: "ts",
    directory: migrationsDir,
  },
  seeds: { extension: "ts", directory: seedsDir },
};

/**
 * Get SSL configuration for database connections
 * - Production: Requires certificate verification (rejectUnauthorized: true)
 * - Development/Test: Allows self-signed certificates (rejectUnauthorized: false)
 */
function getSslConfig():
  | { rejectUnauthorized: boolean; ca?: string; cert?: string; key?: string }
  | undefined {
  const isProduction = process.env.NODE_ENV === "production";
  const sslEnabled = process.env.PGSSL === "true";

  if (!sslEnabled) {
    return undefined;
  }

  if (isProduction) {
    // Production: Strict SSL with certificate verification
    return {
      rejectUnauthorized: true,
      ca: process.env.PGSSL_CA,
      cert: process.env.PGSSL_CERT,
      key: process.env.PGSSL_KEY,
    };
  }

  // Development/Test: Relaxed SSL (allows self-signed certificates)
  return {
    rejectUnauthorized: false,
    ca: process.env.PGSSL_CA,
    cert: process.env.PGSSL_CERT,
    key: process.env.PGSSL_KEY,
  };
}

const config: { [key: string]: Knex.Config } = {
  development: {
    ...shared,
    connection: {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "fitvibe",
      user: process.env.PGUSER || "fitvibe",
      password: process.env.PGPASSWORD || "fitvibe",
      ssl: getSslConfig(),
    },
  },
  test: {
    ...shared,
    connection: {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "fitvibe_test",
      user: process.env.PGUSER || "fitvibe",
      password: process.env.PGPASSWORD || "fitvibe",
      ssl: getSslConfig(),
    },
  },
  production: {
    ...shared,
    connection: {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: getSslConfig(),
    },
  },
};

export default config;
