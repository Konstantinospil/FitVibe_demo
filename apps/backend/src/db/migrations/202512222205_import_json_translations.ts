import type { Knex } from "knex";
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
  // Path relative to migrations directory: go up 4 levels to apps/, then to frontend
  // From: apps/backend/src/db/migrations/
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

export async function up(knex: Knex): Promise<void> {
  // Check if translations table exists
  const hasTable = await knex.schema.hasTable(TRANSLATIONS_TABLE);
  if (!hasTable) {
    throw new Error(
      `Table ${TRANSLATIONS_TABLE} does not exist. Run the create_translations_table migration first.`,
    );
  }
  const hasDeletedAt = await knex.schema.hasColumn(TRANSLATIONS_TABLE, "deleted_at");

  // Check if translations already exist (idempotent check)
  const existingCount = await knex(TRANSLATIONS_TABLE).count("id as count").first();
  if (existingCount && Number((existingCount as { count: string | number }).count) > 0) {
    console.warn(
      `Translations table already has ${(existingCount as { count: string | number }).count} entries. Skipping import.`,
    );
    return;
  }

  console.warn("Starting translation import from JSON files...");

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

  // Upsert translations: restore deleted ones, update active ones, or insert new ones
  // This works with the partial unique index (idx_translations_namespace_key_lang_unique_active)
  const batchSize = 1000;
  for (let i = 0; i < translations.length; i += batchSize) {
    const batch = translations.slice(i, i + batchSize);

    for (const translation of batch) {
      // Check if there's a deleted translation that should be restored
      let deleted: { id: string } | undefined;
      if (hasDeletedAt) {
        deleted = (await knex(TRANSLATIONS_TABLE)
          .where({
            language: translation.language,
            namespace: translation.namespace,
            key_path: translation.key_path,
          })
          .whereNotNull("deleted_at")
          .orderBy("deleted_at", "desc")
          .first()) as { id: string } | undefined;
      }

      if (deleted) {
        // Restore the deleted translation
        await knex(TRANSLATIONS_TABLE)
          .where({ id: deleted.id })
          .update({
            value: translation.value,
            deleted_at: null,
            updated_at: knex.raw("NOW()"),
          });
        continue;
      }

      // Check if there's an active translation
      const activeQuery = knex(TRANSLATIONS_TABLE).where({
        language: translation.language,
        namespace: translation.namespace,
        key_path: translation.key_path,
      });
      if (hasDeletedAt) {
        activeQuery.whereNull("deleted_at");
      }
      const active = (await activeQuery.first()) as { id: string } | undefined;

      if (active) {
        // Update the existing active translation
        const updatePayload: Record<string, unknown> = {
          value: translation.value,
          updated_at: knex.raw("NOW()"),
        };
        if (hasDeletedAt) {
          updatePayload.deleted_at = null;
        }
        await knex(TRANSLATIONS_TABLE).where({ id: active.id }).update(updatePayload);
        continue;
      }

      // No existing translation - insert new one
      await knex(TRANSLATIONS_TABLE).insert({
        ...translation,
        created_at: knex.raw("NOW()"),
        updated_at: knex.raw("NOW()"),
      });
    }

    console.warn(`Processed batch ${Math.floor(i / batchSize) + 1} (${batch.length} translations)`);
  }

  console.warn(`Successfully imported ${translations.length} translations.`);
}

export function down(_knex: Knex): Promise<void> {
  // Optionally delete imported translations (be careful in production!)
  // This would delete ALL translations, not just the imported ones
  // await _knex(TRANSLATIONS_TABLE).del();
  console.warn("Down migration: Translations remain in database (manual cleanup if needed)");
  return Promise.resolve();
}
