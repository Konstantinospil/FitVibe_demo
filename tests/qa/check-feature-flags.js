/* eslint-disable no-console */
// tests/qa/check-feature-flags.mjs (or keep .js under "type": "module")
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const envExamplePath = path.resolve(process.cwd(), ".env.example");

const REQUIRED_FLAGS = ["FEATURE_SOCIAL_FEED", "FEATURE_COACH_DASHBOARD", "FEATURE_INSIGHTS"];

async function main() {
  let contents = "";
  try {
    contents = await readFile(envExamplePath, "utf8");
  } catch (err) {
    console.error(
      `Could not read ${envExamplePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  const missing = [];
  const misconfigured = [];

  for (const flag of REQUIRED_FLAGS) {
    const regex = new RegExp(`^${flag}=([^\\r\\n]+)`, "m");
    const match = contents.match(regex);
    if (!match) {
      missing.push(flag);
      continue;
    }
    const value = match[1].trim().toLowerCase();
    if (value !== "false") {
      misconfigured.push({ flag, value });
    }
  }

  if (missing.length > 0 || misconfigured.length > 0) {
    if (missing.length > 0) {
      console.error(`Missing feature flag defaults in .env.example: ${missing.join(", ")}`);
    }
    for (const issue of misconfigured) {
      console.error(`Feature flag ${issue.flag} must default to "false" but is "${issue.value}"`);
    }
    process.exit(1);
  }

  console.log("Feature flag defaults verified.");
}

await main();
