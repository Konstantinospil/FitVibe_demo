#!/usr/bin/env node
/* eslint-disable no-console */
import { execSync } from "node:child_process";
import process from "node:process";

const pnpmCmd = process.platform === "win32" ? "corepack pnpm" : "pnpm";

const commands = [
  {
    title: "Dependency audit (pnpm)",
    command: `${pnpmCmd} audit --prod --audit-level=high`,
  },
  {
    title: "Static secret scan",
    command: `${process.execPath} tests/security/secret-scan.cjs`,
  },
];

function runCommand(title, command, options = {}) {
  console.log(`\n▶ ${title}`);
  console.log(`$ ${command}`);
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, ...options.env },
    shell: true,
  });
}

try {
  for (const job of commands) {
    runCommand(job.title, job.command, job.options ?? {});
  }

  if (process.env.SNYK_TOKEN) {
    runCommand("Snyk scan", "npx --yes snyk test --severity-threshold=high", {
      env: { SNYK_TOKEN: process.env.SNYK_TOKEN },
    });
  } else {
    console.log("⚠️  Skipping Snyk scan because SNYK_TOKEN is not set.");
  }

  console.log("\n✅ Security checks completed successfully.");
} catch (error) {
  console.error("\nSecurity checks failed.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
