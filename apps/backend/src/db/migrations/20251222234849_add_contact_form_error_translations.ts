import type { Knex } from "knex";
import * as fs from "fs";
import * as path from "path";

const TRANSLATIONS_TABLE = "translations";
const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "el"];
const NAMESPACE = "common";

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

/**
 * Migration to add/update contact form error translations
 * Specifically adds: contact.form.networkError and contact.form.csrfError
 */
export async function up(knex: Knex): Promise<void> {
  // Check if translations table exists
  const hasTable = await knex.schema.hasTable(TRANSLATIONS_TABLE);
  if (!hasTable) {
    throw new Error(
      `Table ${TRANSLATIONS_TABLE} does not exist. Run the create_translations_table migration first.`,
    );
  }

  console.warn("Starting import of new contact form error translations...");

  const translations: Array<{
    namespace: string;
    key_path: string;
    language: string;
    value: string;
  }> = [];

  // Only load translations for keys we care about
  const targetKeys = ["contact.form.networkError", "contact.form.csrfError"];

  for (const language of SUPPORTED_LANGUAGES) {
    const flatTranslations = loadTranslationFile(language, NAMESPACE);

    for (const keyPath of targetKeys) {
      const value = flatTranslations[keyPath];
      if (value) {
        translations.push({
          namespace: NAMESPACE,
          key_path: keyPath,
          language,
          value,
        });
      } else {
        console.warn(`Missing translation for ${language}: ${keyPath}`);
      }
    }
  }

  if (translations.length === 0) {
    console.warn("No translations found to import.");
    return;
  }

  // Upsert translations: restore deleted ones, update active ones, or insert new ones
  // This works with the partial unique index (idx_translations_namespace_key_lang_unique_active)
  for (const translation of translations) {
    // Check if there's a deleted translation that should be restored
    const deleted = (await knex(TRANSLATIONS_TABLE)
      .where({
        language: translation.language,
        namespace: translation.namespace,
        key_path: translation.key_path,
      })
      .whereNotNull("deleted_at")
      .orderBy("deleted_at", "desc")
      .first()) as { id: string } | undefined;

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
    const active = (await knex(TRANSLATIONS_TABLE)
      .where({
        language: translation.language,
        namespace: translation.namespace,
        key_path: translation.key_path,
      })
      .whereNull("deleted_at")
      .first()) as { id: string } | undefined;

    if (active) {
      // Update the existing active translation
      await knex(TRANSLATIONS_TABLE)
        .where({ id: active.id })
        .update({
          value: translation.value,
          updated_at: knex.raw("NOW()"),
          deleted_at: null,
        });
      continue;
    }

    // No existing translation - insert new one
    await knex(TRANSLATIONS_TABLE).insert({
      ...translation,
      created_at: knex.raw("NOW()"),
      updated_at: knex.raw("NOW()"),
    });
  }

  console.warn(`Successfully imported/updated ${translations.length} translations.`);
}

export function down(_knex: Knex): Promise<void> {
  // Optionally remove the new translation keys
  // This would delete the specific keys we added
  console.warn(
    "Down migration: New translation keys remain in database (manual cleanup if needed)",
  );
  return Promise.resolve();
}
