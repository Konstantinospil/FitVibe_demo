#!/usr/bin/env node
/* eslint-disable no-console */
const { db } = require("../../apps/backend/src/db/connection.js");

const LOCALES = ["en", "de", "es", "fr", "el"];
const LOCALE_NAMES = {
  en: "English",
  de: "German",
  es: "Spanish",
  fr: "French",
  el: "Greek",
};

const NAMESPACES = ["common", "auth", "terms", "privacy", "cookie"];

/**
 * Get all translation keys from database for a locale
 */
async function getTranslationKeysFromDB(locale) {
  const keys = new Map();

  for (const namespace of NAMESPACES) {
    const rows = await db("translations")
      .select("key_path", "value")
      .where({ language: locale, namespace });

    for (const row of rows) {
      const prefixedKey = `${namespace}.${row.key_path}`;
      keys.set(prefixedKey, row.value);
    }
  }

  return keys;
}

/**
 * Compare two key maps and return differences
 */
function diff(source, target, excludePrefix = null) {
  const missing = [];
  for (const key of source.keys()) {
    if (excludePrefix && key.startsWith(excludePrefix)) {
      continue;
    }
    if (!target.has(key)) {
      missing.push(key);
    }
  }
  return missing;
}

async function main() {
  try {
    // Load English keys as reference
    const enKeys = await getTranslationKeysFromDB("en");

    if (enKeys.size === 0) {
      console.error("❌ No English translations found in database!");
      console.error("   Run migrations to import translations from JSON files.");
      process.exit(1);
    }

    let hasErrors = false;
    let totalMissing = 0;
    let totalExtra = 0;

    // Check all locales against English
    for (const locale of LOCALES) {
      if (locale === "en") continue;

      const localeName = LOCALE_NAMES[locale];
      const keys = await getTranslationKeysFromDB(locale);

      // For Greek, exclude the greekCharacters section
      const excludePrefix = locale === "el" ? "common.greekCharacters" : null;
      const missingInLocale = diff(enKeys, keys, excludePrefix);
      const extraInLocale = diff(keys, enKeys, excludePrefix);

      if (missingInLocale.length || extraInLocale.length) {
        hasErrors = true;
        totalMissing += missingInLocale.length;
        totalExtra += extraInLocale.length;

        if (missingInLocale.length) {
          console.error(
            `\n❌ Missing ${localeName} translations (${missingInLocale.length} keys):`,
          );
          const byNamespace = {};
          missingInLocale.forEach((key) => {
            const namespace = key.split(".")[0];
            if (!byNamespace[namespace]) byNamespace[namespace] = [];
            byNamespace[namespace].push(key);
          });
          Object.entries(byNamespace).forEach(([namespace, namespaceKeys]) => {
            console.error(`  ${namespace}:`);
            namespaceKeys.forEach((key) => console.error(`    - ${key}`));
          });
        }

        if (extraInLocale.length) {
          console.error(
            `\n⚠️  Extra ${localeName} keys without English equivalents (${extraInLocale.length} keys):`,
          );
          const byNamespace = {};
          extraInLocale.forEach((key) => {
            const namespace = key.split(".")[0];
            if (!byNamespace[namespace]) byNamespace[namespace] = [];
            byNamespace[namespace].push(key);
          });
          Object.entries(byNamespace).forEach(([namespace, namespaceKeys]) => {
            console.error(`  ${namespace}:`);
            namespaceKeys.forEach((key) => console.error(`    - ${key}`));
          });
        }
      }
    }

    // Check for empty values
    const emptyKeys = [];
    for (const locale of LOCALES) {
      const keys = await getTranslationKeysFromDB(locale);
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

    // Check for duplicate keys (database integrity)
    const duplicates = await db("translations")
      .select("namespace", "key_path", "language")
      .groupBy("namespace", "key_path", "language")
      .havingRaw("COUNT(*) > 1");

    if (duplicates.length > 0) {
      hasErrors = true;
      console.error("\n❌ Duplicate translation keys found in database:");
      duplicates.forEach((dup) => {
        console.error(`  - ${dup.language}/${dup.namespace}/${dup.key_path}`);
      });
    }

    if (hasErrors) {
      console.error(
        `\n❌ i18n coverage check failed (${totalMissing} missing, ${totalExtra} extra keys).`,
      );
      process.exit(1);
    }

    // Generate summary
    console.log("\n✅ i18n coverage check passed!");
    console.log("\nTranslation summary:");
    for (const namespace of NAMESPACES) {
      const enCount = await db("translations")
        .where({ language: "en", namespace })
        .count("* as count")
        .first();

      console.log(`  ${namespace}:`);
      console.log(`    EN: ${enCount.count} keys`);

      for (const locale of LOCALES) {
        if (locale === "en") continue;
        const count = await db("translations")
          .where({ language: locale, namespace })
          .count("* as count")
          .first();

        const status = Number(count.count) === Number(enCount.count) ? "✅" : "⚠️";
        console.log(`    ${locale.toUpperCase()}: ${count.count} keys ${status}`);
      }
    }

    const totalEnKeys = enKeys.size;
    const keyCounts = await Promise.all(
      LOCALES.map(async (locale) => {
        const count = await db("translations")
          .where({ language: locale })
          .count("* as count")
          .first();
        return `${count.count} ${locale.toUpperCase()}`;
      }),
    );

    console.log(`\nTotal: ${totalEnKeys} EN keys, ${keyCounts.join(", ")}, 0 missing.`);
  } catch (error) {
    console.error("❌ Error checking translations:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
