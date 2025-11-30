#!/usr/bin/env node

/**
 * Script to move test files from apps/backend/src/**/__tests__/ to tests/backend/
 * and update import paths accordingly.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Map of old paths to new paths
const testFiles = [
  // Root level tests
  { old: "apps/backend/src/__tests__/app.test.ts", new: "tests/backend/app.test.ts" },
  { old: "apps/backend/src/__tests__/server.test.ts", new: "tests/backend/server.test.ts" },
  
  // Config tests
  { old: "apps/backend/src/config/__tests__/index.test.ts", new: "tests/backend/config/index.test.ts" },
  
  // DB tests
  { old: "apps/backend/src/db/scripts/__tests__/scripts.test.ts", new: "tests/backend/db/scripts/scripts.test.ts" },
  { old: "apps/backend/src/db/seeds/__tests__/seed-files.test.ts", new: "tests/backend/db/seeds/seed-files.test.ts" },
  { old: "apps/backend/src/db/utils/__tests__/scripts.test.ts", new: "tests/backend/db/utils/scripts.test.ts" },
  
  // Jobs tests
  { old: "apps/backend/src/jobs/services/__tests__/bullmq.queue.service.test.ts", new: "tests/backend/jobs/services/bullmq.queue.service.test.ts" },
  { old: "apps/backend/src/jobs/services/__tests__/leaderboard-jobs.service.test.ts", new: "tests/backend/jobs/services/leaderboard-jobs.service.test.ts" },
  { old: "apps/backend/src/jobs/services/__tests__/queue.service.test.ts", new: "tests/backend/jobs/services/queue.service.test.ts" },
  
  // Middleware tests
  { old: "apps/backend/src/middlewares/__tests__/auth.guard.test.ts", new: "tests/backend/middlewares/auth.guard.test.ts" },
  { old: "apps/backend/src/middlewares/__tests__/csrf.test.ts", new: "tests/backend/middlewares/csrf.test.ts" },
  { old: "apps/backend/src/middlewares/__tests__/enhanced-security.test.ts", new: "tests/backend/middlewares/enhanced-security.test.ts" },
  { old: "apps/backend/src/middlewares/__tests__/error.handler.test.ts", new: "tests/backend/middlewares/error.handler.test.ts" },
  { old: "apps/backend/src/middlewares/__tests__/rate-limit.test.ts", new: "tests/backend/middlewares/rate-limit.test.ts" },
  { old: "apps/backend/src/middlewares/__tests__/read-only.guard.test.ts", new: "tests/backend/middlewares/read-only.guard.test.ts" },
  { old: "apps/backend/src/middlewares/__tests__/request-logger.test.ts", new: "tests/backend/middlewares/request-logger.test.ts" },
  
  // Observability tests
  { old: "apps/backend/src/observability/__tests__/metrics.test.ts", new: "tests/backend/observability/metrics.test.ts" },
  { old: "apps/backend/src/observability/__tests__/tracing.test.ts", new: "tests/backend/observability/tracing.test.ts" },
  
  // Services tests
  { old: "apps/backend/src/services/__tests__/antivirus.service.test.ts", new: "tests/backend/services/antivirus.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/cache.service.test.ts", new: "tests/backend/services/cache.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/crypto.service.test.ts", new: "tests/backend/services/crypto.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/mailer.service.test.ts", new: "tests/backend/services/mailer.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/mediaStorage.service.test.ts", new: "tests/backend/services/mediaStorage.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/retention.service.test.ts", new: "tests/backend/services/retention.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/secrets.service.test.ts", new: "tests/backend/services/secrets.service.test.ts" },
  { old: "apps/backend/src/services/__tests__/tokens.test.ts", new: "tests/backend/services/tokens.test.ts" },
  { old: "apps/backend/src/services/__tests__/vault.client.test.ts", new: "tests/backend/services/vault.client.test.ts" },
  
  // Utils tests
  { old: "apps/backend/src/utils/__tests__/async-handler.test.ts", new: "tests/backend/utils/async-handler.test.ts" },
  { old: "apps/backend/src/utils/__tests__/audit.util.test.ts", new: "tests/backend/utils/audit.util.test.ts" },
  { old: "apps/backend/src/utils/__tests__/calories.test.ts", new: "tests/backend/utils/calories.test.ts" },
  { old: "apps/backend/src/utils/__tests__/error.utils.test.ts", new: "tests/backend/utils/error.utils.test.ts" },
  { old: "apps/backend/src/utils/__tests__/errors.test.ts", new: "tests/backend/utils/errors.test.ts" },
  { old: "apps/backend/src/utils/__tests__/hash.test.ts", new: "tests/backend/utils/hash.test.ts" },
  { old: "apps/backend/src/utils/__tests__/http.test.ts", new: "tests/backend/utils/http.test.ts" },
  { old: "apps/backend/src/utils/__tests__/ip-extractor.test.ts", new: "tests/backend/utils/ip-extractor.test.ts" },
  { old: "apps/backend/src/utils/__tests__/pagination.test.ts", new: "tests/backend/utils/pagination.test.ts" },
  { old: "apps/backend/src/utils/__tests__/points.test.ts", new: "tests/backend/utils/points.test.ts" },
  { old: "apps/backend/src/utils/__tests__/validation.test.ts", new: "tests/backend/utils/validation.test.ts" },
  { old: "apps/backend/src/utils/__tests__/validators.test.ts", new: "tests/backend/utils/validators.test.ts" },
];

// Add module tests
const modules = ["admin", "auth", "common", "exercise-types", "exercises", "feed", "health", "logs", "plans", "points", "progress", "sessions", "system", "users"];
for (const module of modules) {
  const testDir = `apps/backend/src/modules/${module}/__tests__`;
  // This would need to be populated with actual file names, but for now we'll use a glob pattern
}

function updateImports(content, oldPath, newPath) {
  // Calculate relative path from new location to apps/backend/src
  const newDir = dirname(newPath);
  const sourceBase = "apps/backend/src";
  
  // Replace relative imports
  // Pattern: from "../something" or from "../../something"
  // Need to convert to: from "../../apps/backend/src/something"
  
  // This is complex - we need to:
  // 1. Find all import/require statements with relative paths
  // 2. Calculate the actual target path
  // 3. Calculate new relative path from new location
  
  // For now, let's use a simpler approach: replace common patterns
  let updated = content;
  
  // Replace ../ with calculated path
  // This is a simplified version - in reality we'd need to parse the imports properly
  const relativeDepth = newPath.split("/").length - 2; // Subtract 'tests' and filename
  const backPath = "../".repeat(relativeDepth) + sourceBase;
  
  // Match import/require statements with relative paths
  updated = updated.replace(
    /from\s+["'](\.\.\/)+([^"']+)["']/g,
    (match, dots, path) => {
      const depth = dots.split("../").length - 1;
      const targetPath = join("apps/backend/src", path);
      const newRelative = relative(newDir, targetPath).replace(/\\/g, "/");
      return `from "${newRelative.startsWith(".") ? newRelative : "./" + newRelative}"`;
    }
  );
  
  return updated;
}

function moveTestFile(oldPath, newPath) {
  const oldFullPath = join(rootDir, oldPath);
  const newFullPath = join(rootDir, newPath);
  
  if (!existsSync(oldFullPath)) {
    console.warn(`Skipping ${oldPath} - file not found`);
    return;
  }
  
  // Create directory if it doesn't exist
  const newDir = dirname(newFullPath);
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true });
  }
  
  // Read file
  const content = readFileSync(oldFullPath, "utf-8");
  
  // Update imports
  const updatedContent = updateImports(content, oldPath, newPath);
  
  // Write to new location
  writeFileSync(newFullPath, updatedContent, "utf-8");
  
  console.log(`Moved ${oldPath} -> ${newPath}`);
}

// Run the migration
console.log("Moving test files...");
for (const { old, new: newPath } of testFiles) {
  moveTestFile(old, newPath);
}
console.log("Done!");

