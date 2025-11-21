#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const EN_PATH = path.resolve("apps/frontend/src/i18n/locales/en/common.json");
const DE_PATH = path.resolve("apps/frontend/src/i18n/locales/de/common.json");

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing translation file: ${filePath}`);
    process.exit(1);
  }
}

ensureFile(EN_PATH);
ensureFile(DE_PATH);

const en = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
const de = JSON.parse(fs.readFileSync(DE_PATH, "utf8"));

function flatten(obj, prefix = "") {
  const result = new Map();
  const entries = Array.isArray(obj) ? obj.entries() : Object.entries(obj ?? {});

  for (const [key, value] of entries) {
    const nextKey = prefix ? `${prefix}.${key}` : String(key);
    if (value && typeof value === "object") {
      for (const [childKey, childValue] of flatten(value, nextKey)) {
        result.set(childKey, childValue);
      }
    } else {
      result.set(nextKey, value);
    }
  }

  return result;
}

const enKeys = flatten(en);
const deKeys = flatten(de);

function diff(source, target) {
  const missing = [];
  for (const key of source.keys()) {
    if (!target.has(key)) {
      missing.push(key);
    }
  }
  return missing;
}

const missingInDe = diff(enKeys, deKeys);
const missingInEn = diff(deKeys, enKeys);

if (missingInDe.length || missingInEn.length) {
  if (missingInDe.length) {
    console.error("Missing German translations for keys:");
    missingInDe.forEach((key) => console.error(` - ${key}`));
  }
  if (missingInEn.length) {
    console.error("Extra German keys without English equivalents:");
    missingInEn.forEach((key) => console.error(` - ${key}`));
  }
  process.exit(1);
}

const emptyKeys = [];
for (const [key, value] of [...enKeys.entries(), ...deKeys.entries()]) {
  if (typeof value === "string" && value.trim().length === 0) {
    emptyKeys.push(key);
  }
}

if (emptyKeys.length) {
  console.error("Translation keys must not be empty:");
  emptyKeys.forEach((key) => console.error(` - ${key}`));
  process.exit(1);
}

console.log(
  `i18n coverage check passed (${enKeys.size} EN keys, ${deKeys.size} DE keys, 0 missing).`,
);
