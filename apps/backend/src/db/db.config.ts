import * as dotenv from "dotenv";

dotenv.config();

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

export const DB_CONFIG = {
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? "fitvibe",
  user: process.env.PGUSER ?? "fitvibe",
  password: process.env.PGPASSWORD ?? "fitvibe",
  ssl: getSslConfig(),
} as const;
