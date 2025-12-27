import type { Knex } from "knex";
import * as fs from "fs";
import * as path from "path";

const TRANSLATIONS_TABLE = "translations";
const LANGUAGE = "el";
const NAMESPACE = "privacy";

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
function loadTranslationFile(): Record<string, string> {
  const filePath = path.join(
    __dirname,
    "../../../../frontend/src/i18n/locales",
    LANGUAGE,
    `${NAMESPACE}.json`,
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
  const hasTable = await knex.schema.hasTable(TRANSLATIONS_TABLE);
  if (!hasTable) {
    console.warn(`Table ${TRANSLATIONS_TABLE} does not exist. Skipping update.`);
    return;
  }

  const hasDeletedAt = await knex.schema.hasColumn(TRANSLATIONS_TABLE, "deleted_at");

  const flatTranslations = loadTranslationFile();
  const entries = Object.entries(flatTranslations);

  if (entries.length === 0) {
    console.warn("No Greek privacy translations found to import.");
    return;
  }

  console.warn("Updating Greek privacy translations from JSON...");

  for (const [keyPath, value] of entries) {
    let deleted: { id: string } | undefined;
    if (hasDeletedAt) {
      deleted = (await knex(TRANSLATIONS_TABLE)
        .where({
          language: LANGUAGE,
          namespace: NAMESPACE,
          key_path: keyPath,
        })
        .whereNotNull("deleted_at")
        .orderBy("deleted_at", "desc")
        .first()) as { id: string } | undefined;
    }

    if (deleted) {
      await knex(TRANSLATIONS_TABLE)
        .where({ id: deleted.id })
        .update({
          value,
          deleted_at: null,
          updated_at: knex.raw("NOW()"),
        });
      continue;
    }

    const activeQuery = knex(TRANSLATIONS_TABLE).where({
      language: LANGUAGE,
      namespace: NAMESPACE,
      key_path: keyPath,
    });
    if (hasDeletedAt) {
      activeQuery.whereNull("deleted_at");
    }

    const active = (await activeQuery.first()) as { id: string } | undefined;
    if (active) {
      const updatePayload: Record<string, unknown> = {
        value,
        updated_at: knex.raw("NOW()"),
      };
      if (hasDeletedAt) {
        updatePayload.deleted_at = null;
      }
      await knex(TRANSLATIONS_TABLE).where({ id: active.id }).update(updatePayload);
      continue;
    }

    await knex(TRANSLATIONS_TABLE).insert({
      namespace: NAMESPACE,
      key_path: keyPath,
      language: LANGUAGE,
      value,
      created_at: knex.raw("NOW()"),
      updated_at: knex.raw("NOW()"),
    });
  }

  console.warn(`Updated ${entries.length} Greek privacy translations.`);
}

export function down(_knex: Knex): Promise<void> {
  console.warn(
    "Down migration: Greek privacy translation updates remain in place (manual rollback if needed)",
  );
  return Promise.resolve();
}
