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
var baseConfig = {
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
};
if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
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
