#!/usr/bin/env node
/* eslint-disable no-console */
import knex from "knex";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const LOCALES = ["en", "de", "es", "fr", "el"] as const;
type Locale = (typeof LOCALES)[number];
const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "German",
  es: "Spanish",
  fr: "French",
  el: "Greek",
};

const NAMESPACES = ["common", "auth", "terms", "privacy", "cookie"];

// Create database connection directly
function createDbConnection() {
  // Parse DATABASE_URL if provided, otherwise use individual env vars
  let connection:
    | string
    | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
      };

  if (process.env.DATABASE_URL) {
    connection = process.env.DATABASE_URL;
  } else {
    connection = {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "fitvibe_test",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "postgres",
    };
  }

  return knex({
    client: "pg",
    connection,
    pool: { min: 0, max: 5 },
  });
}

const db = createDbConnection();

/**
 * Get all translation keys from database for a locale
 */
async function getTranslationKeysFromDB(locale: string) {
  const keys = new Map<string, string>();

  for (const namespace of NAMESPACES) {
    const rows = (await db("translations")
      .select("key_path", "value")
      .where({ language: locale, namespace })) as Array<{ key_path: string; value: string }>;

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
function diff(
  source: Map<string, string>,
  target: Map<string, string>,
  excludePrefix: string | null = null,
): string[] {
  const missing: string[] = [];
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

async function main(): Promise<void> {
  try {
    // Test database connection
    await db.raw("SELECT 1");

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
      if (locale === "en") {
        continue;
      }

      const localeName = LOCALE_NAMES[locale as Locale];
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
          const byNamespace: Record<string, string[]> = {};
          missingInLocale.forEach((key) => {
            const namespace = key.split(".")[0];
            if (!byNamespace[namespace]) {
              byNamespace[namespace] = [];
            }
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
          const byNamespace: Record<string, string[]> = {};
          extraInLocale.forEach((key) => {
            const namespace = key.split(".")[0];
            if (!byNamespace[namespace]) {
              byNamespace[namespace] = [];
            }
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
    const emptyKeys: Array<{ locale: string; key: string }> = [];
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
    const duplicates = (await db("translations")
      .select("namespace", "key_path", "language")
      .groupBy("namespace", "key_path", "language")
      .havingRaw("COUNT(*) > 1")) as Array<{
      language: string;
      namespace: string;
      key_path: string;
    }>;

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
        .first<{ count: string | number }>();

      console.log(`  ${namespace}:`);
      console.log(`    EN: ${enCount?.count} keys`);

      for (const locale of LOCALES) {
        if (locale === "en") {
          continue;
        }
        const count = await db("translations")
          .where({ language: locale, namespace })
          .count("* as count")
          .first<{ count: string | number }>();

        const status = Number(count?.count) === Number(enCount?.count) ? "✅" : "⚠️";
        console.log(`    ${locale.toUpperCase()}: ${count?.count} keys ${status}`);
      }
    }

    const totalEnKeys = enKeys.size;
    const keyCounts = await Promise.all(
      LOCALES.map(async (locale) => {
        const count = await db("translations")
          .where({ language: locale })
          .count("* as count")
          .first<{ count: string | number }>();
        return `${count?.count} ${locale.toUpperCase()}`;
      }),
    );

    console.log(`\nTotal: ${totalEnKeys} EN keys, ${keyCounts.join(", ")}, 0 missing.`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error checking translations:", errorMessage);
    if (errorMessage.includes("connect") || errorMessage.includes("ECONNREFUSED")) {
      console.error("\n💡 Tip: Ensure PostgreSQL is running and DATABASE_URL is set correctly.");
      console.error("   You can also set: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE");
    }
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

void main();
