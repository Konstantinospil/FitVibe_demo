import { config as loadEnv } from "dotenv";

import { logger } from "./config/logger.js";
import {
  getDatabaseURL,
  getJWTKeys,
  initializeSecretsManager,
} from "./services/secrets.service.js";

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

function isEnabled(value: string | undefined): boolean {
  return TRUE_VALUES.has((value ?? "").trim().toLowerCase());
}

async function bootstrapRuntimeSecrets(): Promise<void> {
  loadEnv();

  if (!isEnabled(process.env.VAULT_ENABLED)) {
    logger.info("[server] Secrets manager disabled - using environment/files");
    return;
  }

  const token = process.env.VAULT_TOKEN?.trim();
  if (!token) {
    throw new Error("VAULT_ENABLED=true but VAULT_TOKEN is not set");
  }

  initializeSecretsManager({
    provider: "vault",
    vault: {
      enabled: true,
      addr: process.env.VAULT_ADDR?.trim() || "http://localhost:8200",
      token,
      namespace: process.env.VAULT_NAMESPACE?.trim() || undefined,
    },
  });

  const [jwtKeys, databaseUrl] = await Promise.all([getJWTKeys(), getDatabaseURL()]);

  if (!process.env.JWT_PRIVATE_KEY && jwtKeys?.privateKey) {
    process.env.JWT_PRIVATE_KEY = jwtKeys.privateKey;
  }
  if (!process.env.JWT_PUBLIC_KEY && jwtKeys?.publicKey) {
    process.env.JWT_PUBLIC_KEY = jwtKeys.publicKey;
  }
  if (!process.env.DATABASE_URL && databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  }

  logger.info("[server] Runtime secrets loaded from Vault before application bootstrap");
}

export async function startServer(): Promise<void> {
  await bootstrapRuntimeSecrets();

  const [{ default: app }, { env }] = await Promise.all([
    import("./app.js"),
    import("./config/env.js"),
  ]);

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "FitVibe Backend running");
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
  void startServer().catch((error: unknown) => {
    logger.error({ err: error }, "[server] Failed to start");
    process.exit(1);
  });
}
