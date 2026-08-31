#!/usr/bin/env node
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

execSync("tsc -p tsconfig.build.json && vite build", {
  cwd: frontendDir,
  env: { ...process.env, VITE_API_URL: "/" },
  stdio: "inherit",
  shell: true,
});
