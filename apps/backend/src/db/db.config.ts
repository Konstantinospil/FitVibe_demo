import { env } from "../config/env.js";
import { getSslConfig } from "./ssl-config.js";

const ssl = getSslConfig(process.env);

export const DB_CONFIG = env.DATABASE_URL
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
