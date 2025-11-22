process.env.NODE_ENV = "test";
process.env.METRICS_ENABLED = process.env.METRICS_ENABLED ?? "false";
process.env.CSRF_ENABLED = process.env.CSRF_ENABLED ?? "false";
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? "http://localhost:5173";
process.env.CSRF_ALLOWED_ORIGINS = process.env.CSRF_ALLOWED_ORIGINS ?? "http://localhost:5173";
process.env.EMAIL_ENABLED = process.env.EMAIL_ENABLED ?? "false";
process.env.CLAMAV_ENABLED = process.env.CLAMAV_ENABLED ?? "false";
process.env.VAULT_ENABLED = process.env.VAULT_ENABLED ?? "false";

jest.setTimeout(1000 * 30);

// Global teardown to ensure all async operations complete
afterAll(async () => {
  // Switch to real timers to allow proper cleanup
  jest.useRealTimers();

  // Close all database connection pools
  const closePromises: Promise<void>[] = [];

  try {
    // Close connectionDb from connection.ts
    const { db: connectionDb } = await import("./src/db/connection.js");
    if (connectionDb && typeof connectionDb.destroy === "function") {
      closePromises.push(
        connectionDb.destroy().catch(() => {
          // Ignore errors during cleanup
        }),
      );
    }

    // Close db from index.ts (may be different instance)
    const { db: indexDb } = await import("./src/db/index.js");
    if (indexDb && typeof indexDb.destroy === "function") {
      // Check if it's a different instance before closing
      if (indexDb !== connectionDb) {
        closePromises.push(
          indexDb.destroy().catch(() => {
            // Ignore errors during cleanup
          }),
        );
      }
    }
  } catch {
    // Ignore if db modules can't be imported (e.g., in unit tests without DB)
  }

  // Wait for all close operations to complete
  await Promise.all(closePromises);

  // Clear all pending timers
  jest.clearAllTimers();

  // Allow any pending setImmediate callbacks to run
  await new Promise((resolve) => setImmediate(resolve));

  // Give any remaining async operations time to complete
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
});
