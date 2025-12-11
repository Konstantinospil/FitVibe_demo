"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var path = require("node:path");
dotenv_1.default.config();
var baseDir = path.resolve(__dirname, "..");
var migrationsDir = path.resolve(baseDir, "db", "migrations");
var seedsDir = path.resolve(baseDir, "db", "seeds");
var shared = {
  client: "pg",
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: "knex_migrations",
    extension: "ts",
    directory: migrationsDir,
  },
  seeds: { extension: "ts", directory: seedsDir },
};
var config = {
  development: __assign(__assign({}, shared), {
    connection: {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "fitvibe",
      user: process.env.PGUSER || "fitvibe",
      password: process.env.PGPASSWORD || "fitvibe",
    },
  }),
  test: __assign(__assign({}, shared), {
    connection: {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "fitvibe_test",
      user: process.env.PGUSER || "fitvibe",
      password: process.env.PGPASSWORD || "fitvibe",
    },
  }),
  production: __assign(__assign({}, shared), {
    connection: {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    },
  }),
};
exports.default = config;
