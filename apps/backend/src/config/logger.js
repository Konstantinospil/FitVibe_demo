"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var pino_1 = require("pino");
var REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  "req.body.password",
  "req.body.currentPassword",
  "req.body.newPassword",
  "req.body.confirmPassword",
  "req.body.passwordConfirmation",
  "req.body.token",
  "req.body.accessToken",
  "req.body.refreshToken",
  "req.query.token",
  "req.query.accessToken",
  "req.query.refreshToken",
  "*.password",
  "*.passwordHash",
  "*.accessToken",
  "*.refreshToken",
  "*.token",
  "*.secret",
  "*.email",
];
var env = process.env.NODE_ENV || "development";
var level = process.env.LOG_LEVEL || (env === "production" ? "info" : "debug");
var base = {
  service: "backend",
  env: env,
};
if (process.env.APP_VERSION) {
  base.version = process.env.APP_VERSION;
}
if (process.env.GIT_SHA) {
  base.commit = process.env.GIT_SHA;
}
var baseConfig = {
  level: level,
  base: base,
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
};
var prettyEnabled =
  env === "development" || process.env.LOG_PRETTY === "1" || process.env.LOG_PRETTY === "true";
if (prettyEnabled) {
  baseConfig.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      singleLine: true,
    },
  };
}
exports.logger = (0, pino_1.default)(baseConfig);
