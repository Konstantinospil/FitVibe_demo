import type { Knex } from "knex";
import * as fs from "node:fs";
import * as path from "node:path";

const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "el"];
const NAMESPACES = ["common", "auth", "terms", "privacy", "cookie"];

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

export async function seed(knex: Knex): Promise<void> {
  const translations: Array<{
    namespace: string;
    key_path: string;
    language: string;
    value: string;
  }> = [];

  for (const language of SUPPORTED_LANGUAGES) {
    for (const namespace of NAMESPACES) {
      const flatTranslations = loadTranslationFile(language, namespace);
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
    return;
  }

  const batchSize = 1000;
  for (let i = 0; i < translations.length; i += batchSize) {
    const batch = translations.slice(i, i + batchSize);
    await knex.raw(
      `
      INSERT INTO translations (namespace, key_path, language, value)
      SELECT x.namespace, x.key_path, x.language, x.value
      FROM jsonb_to_recordset(?::jsonb)
        AS x(namespace text, key_path text, language text, value text)
      ON CONFLICT (namespace, key_path, language) WHERE deleted_at IS NULL
      DO NOTHING
      `,
      [JSON.stringify(batch)],
    );
  }
}
