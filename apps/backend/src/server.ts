import app from "./app.js";
import db from "./db/index.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initializeSecretsManager } from "./services/secrets.service.js";
import { toErrorPayload } from "./utils/error.utils.js";

const port = env.PORT;

async function ensureMonthlyPartitions(): Promise<void> {
  try {
    await db.raw("SELECT public.ensure_monthly_partitions();");
    logger.info("[server] Monthly partitions ensured");
  } catch (error: unknown) {
    logger.warn(toErrorPayload(error), "[server] Failed to ensure monthly partitions");
  }
}

export async function startServer(): Promise<void> {
  // Initialize secrets manager if enabled
  if (env.vault.enabled) {
    if (!env.vault.token) {
      logger.error("[server] VAULT_ENABLED=true but VAULT_TOKEN is not set");
      process.exit(1);
    }

    initializeSecretsManager({
      provider: "vault",
      vault: {
        enabled: true,
        addr: env.vault.addr,
        token: env.vault.token,
        namespace: env.vault.namespace,
      },
    });

    logger.info({ vaultAddr: env.vault.addr }, "[server] Secrets manager initialized with Vault");
  } else {
    logger.info("[server] Secrets manager disabled - using environment variables");
  }

  if (process.env.NODE_ENV !== "test") {
    await ensureMonthlyPartitions();
  }

  app.listen(port, () => {
    logger.info({ port }, "FitVibe Backend running");
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error: unknown) => {
    logger.error(toErrorPayload(error), "[server] Failed to start backend");
    process.exit(1);
  });
}
