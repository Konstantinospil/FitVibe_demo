/**
 * Manual script to import translations from JSON files
 * This can be run independently of migrations to re-import translations
 */

import db from "../index.js";
import * as fs from "fs";
import * as path from "path";

const TRANSLATIONS_TABLE = "translations";
const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "el"];
const NAMESPACES = ["common", "auth", "terms", "privacy", "cookie"];

/**
 * Recursively flatten a nested object into dot-notation keys
 */
function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (typeof value === "string") {
      result[newKey] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      result[newKey] = String(value);
    }
  }

  return result;
}

/**
 * Load and parse JSON translation file
 */
function loadTranslationFile(language: string, namespace: string): Record<string, string> {
  // Path relative to this script: go up to workspace root, then to frontend
  // From: apps/backend/src/db/scripts/
  // Up 4: apps/
  // Then: frontend/src/i18n/locales/
  const filePath = path.join(
    __dirname,
    "../../../../frontend/src/i18n/locales",
    language,
    `${namespace}.json`,
  );

  if (!fs.existsSync(filePath)) {
    console.warn(`Translation file not found: ${filePath}`);
    return {};
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(content) as Record<string, unknown>;
  return flattenObject(json);
}

async function main(): Promise<void> {
  try {
    console.warn("Starting translation import from JSON files...");

    // Check if translations table exists
    const hasTable = await db.schema.hasTable(TRANSLATIONS_TABLE);
    if (!hasTable) {
      throw new Error(
        `Table ${TRANSLATIONS_TABLE} does not exist. Run the create_translations_table migration first.`,
      );
    }

    const translations: Array<{
      namespace: string;
      key_path: string;
      language: string;
      value: string;
    }> = [];

    for (const language of SUPPORTED_LANGUAGES) {
      for (const namespace of NAMESPACES) {
        const flatTranslations = loadTranslationFile(language, namespace);
        console.warn(
          `Loaded ${Object.keys(flatTranslations).length} keys for ${language}/${namespace}`,
        );

        for (const [keyPath, value] of Object.entries(flatTranslations)) {
          translations.push({
            namespace,
            key_path: keyPath,
            language,
            value,
          });
        }
      }
    }

    if (translations.length === 0) {
      console.warn("No translations found to import.");
      return;
    }

    console.warn(`Total translations to import: ${translations.length}`);

    // Clear existing translations (optional - remove this if you want to keep existing ones)
    const deleteCount = await db(TRANSLATIONS_TABLE).del();
    console.warn(`Cleared ${deleteCount} existing translations`);

    // Batch insert translations (PostgreSQL limit is ~32767 parameters per query)
    const batchSize = 1000;
    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = translations.slice(i, i + batchSize);
      await db(TRANSLATIONS_TABLE)
        .insert(batch)
        .onConflict(["namespace", "key_path", "language"])
        .ignore();
      console.warn(
        `Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} translations)`,
      );
    }

    console.warn(`Successfully imported ${translations.length} translations.`);
  } catch (error) {
    console.error("Failed to import translations:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

void main();
