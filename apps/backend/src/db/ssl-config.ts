import fs from "node:fs";

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

export type PgSslConfig = {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
};

function isEnabled(value: string | undefined): boolean {
  return TRUE_VALUES.has((value ?? "").trim().toLowerCase());
}

function readOptionalFile(pathOrPem: string | undefined): string | undefined {
  if (!pathOrPem) {
    return undefined;
  }
  const trimmed = pathOrPem.trim();
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

/**
 * PostgreSQL SSL options from env.
 * - PGSSL unset/false: no SSL
 * - PGSSL true in production (or PGSSL_REJECT_UNAUTHORIZED true): verify the server cert
 * - PGSSL true otherwise: SSL with relaxed verification (local/dev)
 * - PGSSL_CA / PGSSL_CERT / PGSSL_KEY: PEM or filesystem path
 */
export function getSslConfig(env: NodeJS.ProcessEnv = process.env): PgSslConfig | undefined {
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
