#!/usr/bin/env node
/**
 * Cleanup script for visual regression test artifacts.
 * Removes old screenshot diffs and test results beyond retention period.
 *
 * Usage:
 *   node scripts/cleanup-visual-artifacts.mjs [--retention-days=30]
 */

import { readdir, stat, unlink, rmdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || "30", 10);
const SCREENSHOTS_DIR = join(ROOT_DIR, "tests/frontend/visual/__screenshots__");
const TEST_RESULTS_DIR = join(ROOT_DIR, "test-results/visual");

/**
 * Remove files older than retention period
 */
async function cleanupDirectory(dir, pattern = /.*/) {
  try {
    const files = await readdir(dir, { withFileTypes: true });
    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let removedCount = 0;

    for (const file of files) {
      const filePath = join(dir, file.name);

      // Skip if doesn't match pattern (e.g., only cleanup diff files)
      if (!pattern.test(file.name)) {
        continue;
      }

      try {
        const stats = await stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          if (file.isDirectory()) {
            await rmdir(filePath, { recursive: true });
          } else {
            await unlink(filePath);
          }
          removedCount++;
          console.log(`Removed: ${filePath} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
        }
      } catch (err) {
        console.warn(`Warning: Could not process ${filePath}:`, err.message);
      }
    }

    return removedCount;
  } catch (err) {
    if (err.code === "ENOENT") {
      // Directory doesn't exist, nothing to clean
      return 0;
    }
    throw err;
  }
}

async function main() {
  console.log(`Cleaning up visual test artifacts older than ${RETENTION_DAYS} days...`);

  let totalRemoved = 0;

  // Clean up screenshot diffs (files ending with -diff.png or -actual.png)
  if (await stat(SCREENSHOTS_DIR).catch(() => null)) {
    const removed = await cleanupDirectory(SCREENSHOTS_DIR, /-diff\.png$|-actual\.png$/);
    totalRemoved += removed;
    console.log(`Removed ${removed} screenshot diff files from ${SCREENSHOTS_DIR}`);
  }

  // Clean up test results (old test result files)
  if (await stat(TEST_RESULTS_DIR).catch(() => null)) {
    const removed = await cleanupDirectory(TEST_RESULTS_DIR);
    totalRemoved += removed;
    console.log(`Removed ${removed} test result files from ${TEST_RESULTS_DIR}`);
  }

  console.log(`\nTotal files removed: ${totalRemoved}`);
  console.log("Cleanup complete.");
}

main().catch((err) => {
  console.error("Error during cleanup:", err);
  process.exit(1);
});
