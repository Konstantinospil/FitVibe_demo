#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const TARGETS = [path.join(ROOT, "tests")];
const BANNED = [
  /if\s*\(\s*!dbAvailable\s*\)\s*\{\s*return;?\s*\}/,
  /if\s*\(\s*!dbAvailable\s*\)\s*return;/,
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (/\.(test|spec)\.(ts|tsx|js|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const hits = [];
for (const file of TARGETS.flatMap((dir) => walk(dir))) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of BANNED) {
    if (pattern.test(source)) {
      hits.push(file);
      break;
    }
  }
}

if (hits.length > 0) {
  console.error("Silent test returns are banned. Use describeWithTestDatabase / it.skip:");
  for (const file of hits) {
    console.error(`  - ${path.relative(ROOT, file)}`);
  }
  process.exit(1);
}

console.log("No silent database-guard returns in tests.");
