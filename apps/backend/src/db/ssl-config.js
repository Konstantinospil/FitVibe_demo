"use strict";

const fs = require("node:fs");

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

function isEnabled(value) {
  return TRUE_VALUES.has((value ?? "").trim().toLowerCase());
}

function readOptionalFile(pathOrPem) {
  if (!pathOrPem) {
    return undefined;
  }
  const trimmed = String(pathOrPem).trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.includes("-----BEGIN")) {
    return trimmed;
  }
  try {
    if (fs.existsSync(trimmed)) {
      return fs.readFileSync(trimmed, "utf8");
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function getSslConfig(env = process.env) {
  if (!isEnabled(env.PGSSL)) {
    return undefined;
  }

  const rejectUnauthorized =
    env.NODE_ENV === "production" || isEnabled(env.PGSSL_REJECT_UNAUTHORIZED);
  const ca = readOptionalFile(env.PGSSL_CA);
  const cert = readOptionalFile(env.PGSSL_CERT);
  const key = readOptionalFile(env.PGSSL_KEY);

  return {
    rejectUnauthorized,
    ...(ca ? { ca } : {}),
    ...(cert ? { cert } : {}),
    ...(key ? { key } : {}),
  };
}

module.exports = { getSslConfig };
