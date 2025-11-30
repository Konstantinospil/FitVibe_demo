"use strict";
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_CONFIG = void 0;
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
exports.DB_CONFIG = {
  host: (_a = process.env.PGHOST) !== null && _a !== void 0 ? _a : "localhost",
  port: Number((_b = process.env.PGPORT) !== null && _b !== void 0 ? _b : 5432),
  database: (_c = process.env.PGDATABASE) !== null && _c !== void 0 ? _c : "fitvibe",
  user: (_d = process.env.PGUSER) !== null && _d !== void 0 ? _d : "fitvibe",
  password: (_e = process.env.PGPASSWORD) !== null && _e !== void 0 ? _e : "fitvibe",
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
};
