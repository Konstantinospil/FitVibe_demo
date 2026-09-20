import { env } from "../config/env.js";
import { getSslConfig, type PgSslConfig } from "./ssl-config.js";

export interface DatabaseConnectionConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: PgSslConfig;
}

const ssl = getSslConfig(process.env);

export const DB_CONFIG: DatabaseConnectionConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl,
    }
  : {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      ssl,
    };
