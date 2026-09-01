import * as dotenv from "dotenv";
import { getSslConfig } from "./ssl-config.js";

dotenv.config();

export const DB_CONFIG = {
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? "fitvibe",
  user: process.env.PGUSER ?? "fitvibe",
  password: process.env.PGPASSWORD ?? "fitvibe",
  ssl: getSslConfig(process.env),
} as const;
