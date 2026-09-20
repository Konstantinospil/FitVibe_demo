import { env } from "../config/env.js";
import { getSslConfig } from "./ssl-config.js";

export const DB_CONFIG = env.DATABASE_URL
  ? env.DATABASE_URL
  : {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      ssl: getSslConfig(process.env),
    };
