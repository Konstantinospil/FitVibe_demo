#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const LOCALES = ["en", "de", "es", "fr", "el"];
const LOCALE_NAMES = {
  en: "English",
  de: "German",
  es: "Spanish",
  fr: "French",
  el: "Greek",
};

// All translation files that should be checked
const TRANSLATION_FILES = ["common.json", "auth.json", "terms.json", "privacy.json", "cookie.json"];

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing translation file: ${filePath}`);
    process.exit(1);
  }
}

// Load all translation files for all locales
const translations = {};
for (const locale of LOCALES) {
  translations[locale] = {};
  for (const file of TRANSLATION_FILES) {
    const filePath = path.resolve(`apps/frontend/src/i18n/locales/${locale}/${file}`);
    ensureFile(filePath);
    translations[locale][file] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
}

const en = translations.en;

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

// Flatten all translation files for English (reference)
const enKeys = new Map();
for (const file of TRANSLATION_FILES) {
  const fileKeys = flatten(en[file]);
  // Prefix keys with filename to avoid conflicts (e.g., "common.navigation.home")
  for (const [key, value] of fileKeys.entries()) {
    const filePrefix = file.replace(".json", "");
    const prefixedKey = `${filePrefix}.${key}`;
    enKeys.set(prefixedKey, value);
  }
}

// Flatten all translation files for all locales
const localeKeys = {};
for (const locale of LOCALES) {
  localeKeys[locale] = new Map();
  for (const file of TRANSLATION_FILES) {
    const fileKeys = flatten(translations[locale][file]);
    // Prefix keys with filename to avoid conflicts
    for (const [key, value] of fileKeys.entries()) {
      const filePrefix = file.replace(".json", "");
      const prefixedKey = `${filePrefix}.${key}`;
      localeKeys[locale].set(prefixedKey, value);
    }
  }
}

function diff(source, target, excludePrefix = null) {
  const missing = [];
  for (const key of source.keys()) {
    // Skip keys that start with the exclude prefix (e.g., "greekCharacters" for Greek)
    if (excludePrefix && key.startsWith(excludePrefix)) {
      continue;
    }
    if (!target.has(key)) {
      missing.push(key);
    }
  }
  return missing;
}

let hasErrors = false;
let totalMissing = 0;
let totalExtra = 0;

// Check all locales against English
for (const locale of LOCALES) {
  if (locale === "en") continue;

  const localeName = LOCALE_NAMES[locale];
  const keys = localeKeys[locale];
  // For Greek, exclude the greekCharacters section from comparison
  const excludePrefix = locale === "el" ? "common.greekCharacters" : null;
  const missingInLocale = diff(enKeys, keys, excludePrefix);
  const extraInLocale = diff(keys, enKeys, excludePrefix);

  if (missingInLocale.length || extraInLocale.length) {
    hasErrors = true;
    totalMissing += missingInLocale.length;
    totalExtra += extraInLocale.length;

    if (missingInLocale.length) {
      console.error(`\n❌ Missing ${localeName} translations (${missingInLocale.length} keys):`);
      // Group by file for better readability
      const byFile = {};
      missingInLocale.forEach((key) => {
        const file = key.split(".")[0];
        if (!byFile[file]) byFile[file] = [];
        byFile[file].push(key);
      });
      Object.entries(byFile).forEach(([file, fileKeys]) => {
        console.error(`  ${file}.json:`);
        fileKeys.forEach((key) => console.error(`    - ${key}`));
      });
    }
    if (extraInLocale.length) {
      console.error(
        `\n⚠️  Extra ${localeName} keys without English equivalents (${extraInLocale.length} keys):`,
      );
      const byFile = {};
      extraInLocale.forEach((key) => {
        const file = key.split(".")[0];
        if (!byFile[file]) byFile[file] = [];
        byFile[file].push(key);
      });
      Object.entries(byFile).forEach(([file, fileKeys]) => {
        console.error(`  ${file}.json:`);
        fileKeys.forEach((key) => console.error(`    - ${key}`));
      });
    }
  }
}

// Check for empty keys in all locales
const emptyKeys = [];
for (const locale of LOCALES) {
  const keys = localeKeys[locale];
  for (const [key, value] of keys.entries()) {
    if (typeof value === "string" && value.trim().length === 0) {
      emptyKeys.push({ locale: LOCALE_NAMES[locale], key });
    }
  }
}

if (emptyKeys.length) {
  hasErrors = true;
  console.error("\n❌ Translation keys must not be empty:");
  emptyKeys.forEach(({ locale, key }) => console.error(`  - ${locale}: ${key}`));
}

if (hasErrors) {
  console.error(
    `\n❌ i18n coverage check failed (${totalMissing} missing, ${totalExtra} extra keys).`,
  );
  process.exit(1);
}

// Calculate totals per file for summary
const fileStats = {};
for (const file of TRANSLATION_FILES) {
  const filePrefix = file.replace(".json", "");
  fileStats[file] = {
    en: 0,
    locales: {},
  };
  for (const key of enKeys.keys()) {
    if (key.startsWith(`${filePrefix}.`)) {
      fileStats[file].en++;
    }
  }
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    fileStats[file].locales[locale] = 0;
    for (const key of localeKeys[locale].keys()) {
      if (key.startsWith(`${filePrefix}.`)) {
        fileStats[file].locales[locale]++;
      }
    }
  }
}

console.log("\n✅ i18n coverage check passed!");
console.log("\nTranslation file summary:");
for (const [file, stats] of Object.entries(fileStats)) {
  console.log(`  ${file}:`);
  console.log(`    EN: ${stats.en} keys`);
  for (const [locale, count] of Object.entries(stats.locales)) {
    const status = count === stats.en ? "✅" : "⚠️";
    console.log(`    ${locale.toUpperCase()}: ${count} keys ${status}`);
  }
}

const totalEnKeys = enKeys.size;
const keyCounts = LOCALES.map(
  (locale) => `${localeKeys[locale].size} ${locale.toUpperCase()}`,
).join(", ");
console.log(`\nTotal: ${totalEnKeys} EN keys across all files, ${keyCounts}, 0 missing.`);
