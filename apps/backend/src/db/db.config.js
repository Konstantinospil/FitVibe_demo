"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_CONFIG = void 0;
var dotenv_1 = require("dotenv");
var ssl_config_1 = require("./ssl-config.js");
dotenv_1.default.config();
exports.DB_CONFIG = {
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? "fitvibe",
  user: process.env.PGUSER ?? "fitvibe",
  password: process.env.PGPASSWORD ?? "fitvibe",
  ssl: (0, ssl_config_1.getSslConfig)(process.env),
};
