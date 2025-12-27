import pino, { type LoggerOptions } from "pino";

const REDACT_PATHS = [
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

const env = process.env.NODE_ENV ?? "development";
const level = process.env.LOG_LEVEL ?? (env === "production" ? "info" : "debug");

const base: Record<string, string> = {
  service: "backend",
  env,
};
if (process.env.APP_VERSION) {
  base.version = process.env.APP_VERSION;
}
if (process.env.GIT_SHA) {
  base.commit = process.env.GIT_SHA;
}

const baseConfig: LoggerOptions = {
  level,
  base,
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
};

const prettyEnabled =
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

export const logger = pino(baseConfig);
