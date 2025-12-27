import { config as loadEnv } from "dotenv";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { createHash, generateKeyPairSync, createPublicKey, randomBytes } from "node:crypto";
import { logger } from "./logger.js";

// Find project root by looking for pnpm-workspace.yaml or package.json
function findProjectRoot(startDir: string): string {
  let current = path.resolve(startDir);
  const maxDepth = 10; // Prevent infinite loops
  let depth = 0;

  while (current !== path.dirname(current) && depth < maxDepth) {
    if (
      fs.existsSync(path.join(current, "pnpm-workspace.yaml")) ||
      (fs.existsSync(path.join(current, "package.json")) &&
        fs.existsSync(path.join(current, "apps", "backend")))
    ) {
      return current;
    }
    current = path.dirname(current);
    depth++;
  }
  // Fallback: try process.cwd() (where the command was run from)
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) {
    return cwd;
  }
  return startDir; // Last fallback
}

// Load .env from project root
// In development, __dirname is apps/backend/src/config
// In compiled code, __dirname is apps/backend/dist/config
const projectRoot = findProjectRoot(__dirname);
const envPath = path.join(projectRoot, ".env");

// Try loading from project root first, then fallback to process.cwd()
let envResult = loadEnv({ path: envPath });
if (!envResult || !envResult.parsed) {
  // Fallback: try loading from current working directory
  const cwdEnvPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(cwdEnvPath)) {
    const fallbackResult = loadEnv({ path: cwdEnvPath });
    if (fallbackResult) {
      envResult = fallbackResult;
    }
  }
  // Ensure envResult is defined even if loading failed
  if (!envResult) {
    envResult = { parsed: {}, error: undefined };
  }
}

// Log for debugging (only in development, and only if logger is available)
if (process.env.NODE_ENV !== "production" && typeof logger !== "undefined") {
  if (envResult && envResult.parsed) {
    logger.info(
      {
        projectRoot,
        envPath,
        envExists: fs.existsSync(envPath),
        loaded: true,
      },
      "[env] Environment configuration loaded",
    );
  } else {
    logger.warn(
      {
        projectRoot,
        envPath,
        envExists: fs.existsSync(envPath),
        cwd: process.cwd(),
        error: envResult?.error,
      },
      "[env] Failed to load .env file",
    );
  }
}

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default("localhost"),
  PGPORT: z.coerce.number().default(5432),
  PGDATABASE: z.string().default("fitvibe"),
  PGUSER: z.string().default("fitvibe"),
  PGPASSWORD: z.string().default("fitvibe"),
  PGSSL: z.string().optional(),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL_SEC: z.coerce.number().default(60 * 60 * 24 * 14),
  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  CSRF_ALLOWED_ORIGINS: z.string().optional(),
  CSRF_ENABLED: z.string().optional(),
  CSRF_COOKIE_KEY: z.string().optional(),
  DEBUG_AUTH_TOKENS: z.string().optional(),
  GLOBAL_RATE_LIMIT_POINTS: z.coerce.number().default(120),
  GLOBAL_RATE_LIMIT_DURATION: z.coerce.number().default(60),
  METRICS_ENABLED: z.string().optional(),
  TYPES_CACHE_TTL_SEC: z.coerce.number().default(60),
  ACCESS_COOKIE_NAME: z.string().default("fitvibe_access"),
  REFRESH_COOKIE_NAME: z.string().default("fitvibe_refresh"),
  EMAIL_VERIFICATION_TTL_MIN: z.coerce.number().default(15),
  PASSWORD_RESET_TTL_MIN: z.coerce.number().default(15),
  APP_BASE_URL: z.string().default("http://localhost:4000"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PRIVATE_KEY_PATH: z.string().default("./keys/jwt_rs256.key"),
  JWT_PUBLIC_KEY_PATH: z.string().default("./keys/jwt_rs256.pub"),
  MEDIA_STORAGE_ROOT: z.string().default("./storage"),
  DSR_PURGE_DELAY_MIN: z.coerce.number().default(15),
  DSR_BACKUP_PURGE_DAYS: z.coerce.number().default(14),
  READ_ONLY_MODE: z.string().optional(),
  MAINTENANCE_MESSAGE: z
    .string()
    .default("System is temporarily in read-only mode for maintenance"),
  CLAMAV_ENABLED: z.string().optional(),
  CLAMAV_DEV_SCAN: z.string().optional(),
  CLAMAV_HOST: z.string().default("localhost"),
  CLAMAV_PORT: z.coerce.number().default(3310),
  CLAMAV_TIMEOUT: z.coerce.number().default(60000),
  VAULT_ENABLED: z.string().optional(),
  VAULT_ADDR: z.string().default("http://localhost:8200"),
  VAULT_TOKEN: z.string().optional(),
  VAULT_NAMESPACE: z.string().optional(),
  JWT_KEY_ROTATION_DAYS: z.coerce.number().default(90),
  EMAIL_ENABLED: z.string().optional(),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default("FitVibe"),
  SMTP_FROM_EMAIL: z.string().optional(),
  APP_NAME: z.string().default("FitVibe"),
  TRUST_PROXY: z.string().optional(),
});

const raw = EnvSchema.parse(process.env);
const defaultCsrfEnabled = raw.NODE_ENV !== "test";

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return TRUE_VALUES.has(value.trim().toLowerCase());
};

const parseList = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const normalizeOrigin = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const { origin } = new URL(trimmed);
    return origin;
  } catch {
    return trimmed.replace(/\/$/, "");
  }
};

const normalizeKey = (value?: string) => value?.replace(/\\n/g, "\n").trim();

let privateKey = normalizeKey(raw.JWT_PRIVATE_KEY);
let publicKey = normalizeKey(raw.JWT_PUBLIC_KEY);

if (!privateKey && raw.JWT_PRIVATE_KEY_PATH) {
  const resolved = path.resolve(raw.JWT_PRIVATE_KEY_PATH);
  if (fs.existsSync(resolved)) {
    privateKey = fs.readFileSync(resolved, "utf8");
  }
}

if (!publicKey && raw.JWT_PUBLIC_KEY_PATH) {
  const resolved = path.resolve(raw.JWT_PUBLIC_KEY_PATH);
  if (fs.existsSync(resolved)) {
    publicKey = fs.readFileSync(resolved, "utf8");
  }
}

if (!privateKey || !publicKey) {
  const { privateKey: generatedPrivateKey, publicKey: generatedPublicKey } = generateKeyPairSync(
    "rsa",
    {
      modulusLength: 2048,
    },
  );
  if (!privateKey) {
    privateKey = generatedPrivateKey.export({ type: "pkcs1", format: "pem" }).toString();
    logger.warn("[env] JWT_PRIVATE_KEY not provided; generated ephemeral development key.");
  }
  if (!publicKey) {
    publicKey = generatedPublicKey.export({ type: "pkcs1", format: "pem" }).toString();
    logger.warn("[env] JWT_PUBLIC_KEY not provided; generated ephemeral development key.");
  }
}

if (!privateKey || !publicKey) {
  throw new Error(
    "Unable to resolve RSA key pair for JWT signing. Please set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY.",
  );
}

const defaultOrigins = [
  normalizeOrigin(raw.FRONTEND_URL),
  normalizeOrigin(raw.APP_BASE_URL),
  normalizeOrigin("http://localhost:5174"), // Backoffice
].filter(Boolean) as string[];

const allowedOrigins = (() => {
  const configured = parseList(raw.ALLOWED_ORIGINS)
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean) as string[];
  const candidates = configured.length ? configured : defaultOrigins;
  return Array.from(new Set(candidates));
})();

const csrfAllowedOrigins = (() => {
  const configured = parseList(raw.CSRF_ALLOWED_ORIGINS)
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean) as string[];
  return configured.length ? configured : allowedOrigins;
})();

function parseCsrfCookieKey(value: string | undefined, isProduction: boolean): Buffer {
  if (!value) {
    if (isProduction) {
      throw new Error("CSRF_COOKIE_KEY must be set in production.");
    }
    logger.warn("[env] CSRF_COOKIE_KEY not set; generating ephemeral key for development.");
    return randomBytes(32);
  }

  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const decoded = Buffer.from(trimmed, "base64");
  if (decoded.length !== 32) {
    throw new Error("CSRF_COOKIE_KEY must be 32 bytes (hex or base64-encoded).");
  }

  return decoded;
}

const csrfCookieKey = parseCsrfCookieKey(raw.CSRF_COOKIE_KEY, raw.NODE_ENV === "production");

export const env = {
  NODE_ENV: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === "production",
  PORT: raw.PORT,
  DATABASE_URL: raw.DATABASE_URL,
  database: {
    host: raw.PGHOST,
    port: raw.PGPORT,
    name: raw.PGDATABASE,
    user: raw.PGUSER,
    password: raw.PGPASSWORD,
    ssl: parseBoolean(raw.PGSSL, false),
  },
  ACCESS_TOKEN_TTL: raw.ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL: raw.REFRESH_TOKEN_TTL_SEC,
  EMAIL_VERIFICATION_TTL_SEC: raw.EMAIL_VERIFICATION_TTL_MIN * 60,
  PASSWORD_RESET_TTL_SEC: raw.PASSWORD_RESET_TTL_MIN * 60,
  COOKIE_DOMAIN: raw.COOKIE_DOMAIN,
  COOKIE_SECURE: parseBoolean(raw.COOKIE_SECURE, raw.NODE_ENV === "production"),
  ACCESS_COOKIE_NAME: raw.ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME: raw.REFRESH_COOKIE_NAME,
  allowedOrigins,
  csrf: {
    enabled: parseBoolean(raw.CSRF_ENABLED, defaultCsrfEnabled),
    allowedOrigins: csrfAllowedOrigins,
    cookieKey: csrfCookieKey,
  },
  metricsEnabled: parseBoolean(raw.METRICS_ENABLED, true),
  globalRateLimit: {
    points: raw.GLOBAL_RATE_LIMIT_POINTS,
    duration: raw.GLOBAL_RATE_LIMIT_DURATION,
  },
  typesCacheTtl: raw.TYPES_CACHE_TTL_SEC,
  appBaseUrl: raw.APP_BASE_URL,
  frontendUrl: raw.FRONTEND_URL,
  appName: raw.APP_NAME,
  mediaStorageRoot: raw.MEDIA_STORAGE_ROOT,
  dsr: {
    purgeDelayMinutes: raw.DSR_PURGE_DELAY_MIN,
    backupPurgeDays: raw.DSR_BACKUP_PURGE_DAYS,
  },
  readOnlyMode: parseBoolean(raw.READ_ONLY_MODE, false),
  maintenanceMessage: raw.MAINTENANCE_MESSAGE,
  clamav: {
    enabled: parseBoolean(raw.CLAMAV_ENABLED, false),
    devScan: parseBoolean(raw.CLAMAV_DEV_SCAN, false),
    host: raw.CLAMAV_HOST,
    port: raw.CLAMAV_PORT,
    timeout: raw.CLAMAV_TIMEOUT,
  },
  vault: {
    enabled: parseBoolean(raw.VAULT_ENABLED, false),
    addr: raw.VAULT_ADDR,
    token: raw.VAULT_TOKEN,
    namespace: raw.VAULT_NAMESPACE,
  },
  jwtKeyRotationDays: raw.JWT_KEY_ROTATION_DAYS,
  email: {
    enabled: parseBoolean(raw.EMAIL_ENABLED, false),
    smtp: {
      host: raw.SMTP_HOST,
      port: raw.SMTP_PORT,
      secure: parseBoolean(raw.SMTP_SECURE, false),
      user: raw.SMTP_USER,
      pass: raw.SMTP_PASS,
    },
    from: {
      name: raw.SMTP_FROM_NAME,
      email: raw.SMTP_FROM_EMAIL || raw.SMTP_USER,
    },
  },
  debugAuthTokens: parseBoolean(raw.DEBUG_AUTH_TOKENS, false),
  // Trust X-Forwarded-For header when behind a reverse proxy (default: true in production)
  // Set to false if not behind a proxy to prevent IP spoofing attacks
  trustProxy: parseBoolean(raw.TRUST_PROXY, raw.NODE_ENV === "production"),
} as const;

export const RSA_KEYS = {
  privateKey: privateKey,
  publicKey: publicKey,
};

const publicKeyObject = createPublicKey(publicKey);
const jwk = publicKeyObject.export({ format: "jwk" }) as JsonWebKey;
const kid = createHash("sha256").update(publicKey).digest("base64url").slice(0, 16);

export const JWKS = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid,
      n: jwk.n!,
      e: jwk.e!,
    },
  ],
} as const;
