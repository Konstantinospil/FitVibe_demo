import type { Knex } from "knex";
import * as fs from "fs";
import * as path from "path";

const TRANSLATIONS_TABLE = "translations";
const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "el"];

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

function loadTranslationFile(language: string, namespace: string): Record<string, string> {
  const filePath = path.join(
    __dirname,
    "../../../../frontend/src/i18n/locales",
    language,
    `${namespace}.json`,
  );

  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(content) as Record<string, unknown>;
  return flattenObject(json);
}

/**
 * Keys to backfill: common.terms.revokeError, common.privacy.revokeError, cookie.revokeError
 */
const COMMON_KEYS = ["terms.revokeError", "privacy.revokeError"];
const COOKIE_KEYS = ["revokeError"];

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(TRANSLATIONS_TABLE);
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
    const commonFlat = loadTranslationFile(language, "common");
    for (const key of COMMON_KEYS) {
      const value = commonFlat[key];
      if (value) {
        translations.push({ namespace: "common", key_path: key, language, value });
      }
    }
    const cookieFlat = loadTranslationFile(language, "cookie");
    for (const key of COOKIE_KEYS) {
      const value = cookieFlat[key];
      if (value) {
        translations.push({ namespace: "cookie", key_path: key, language, value });
      }
    }
  }

  if (translations.length === 0) {
    return;
  }

  for (const t of translations) {
    const deleted = (await knex(TRANSLATIONS_TABLE)
      .where({ language: t.language, namespace: t.namespace, key_path: t.key_path })
      .whereNotNull("deleted_at")
      .orderBy("deleted_at", "desc")
      .first()) as { id: string } | undefined;

    if (deleted) {
      await knex(TRANSLATIONS_TABLE)
        .where({ id: deleted.id })
        .update({
          value: t.value,
          deleted_at: null,
          updated_at: knex.raw("NOW()"),
        });
      continue;
    }

    const active = (await knex(TRANSLATIONS_TABLE)
      .where({ language: t.language, namespace: t.namespace, key_path: t.key_path })
      .whereNull("deleted_at")
      .first()) as { id: string } | undefined;

    if (active) {
      await knex(TRANSLATIONS_TABLE)
        .where({ id: active.id })
        .update({
          value: t.value,
          updated_at: knex.raw("NOW()"),
          deleted_at: null,
        });
      continue;
    }

    await knex(TRANSLATIONS_TABLE).insert({
      ...t,
      created_at: knex.raw("NOW()"),
      updated_at: knex.raw("NOW()"),
    });
  }
}

export function down(_knex: Knex): Promise<void> {
  return Promise.resolve();
}
