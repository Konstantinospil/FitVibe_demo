import { db } from "../../db/connection.js";
import type { Knex } from "knex";
import type {
  TranslationRecord,
  TranslationInsert,
  TranslationUpdate,
  SupportedLanguage,
  TranslationNamespace,
} from "./translations.types.js";

const TRANSLATIONS_TABLE = "translations";

function withDb(trx?: Knex.Transaction) {
  return trx ?? db;
}

/**
 * Get all translations for a language and optional namespace
 * Returns a flat object with dot-notation keys
 */
export async function getTranslations(
  language: SupportedLanguage,
  namespace?: TranslationNamespace,
): Promise<Record<string, string>> {
  let query = db(TRANSLATIONS_TABLE).select("key_path", "value").where("language", language);

  if (namespace) {
    query = query.where("namespace", namespace);
  }

  const rows = (await query) as Array<{ key_path: string; value: string }>;
  const result: Record<string, string> = {};

  for (const row of rows) {
    result[row.key_path] = row.value;
  }

  return result;
}

/**
 * Get translations as nested object structure (for i18next format)
 */
export async function getTranslationsNested(
  language: SupportedLanguage,
  namespace?: TranslationNamespace,
): Promise<Record<string, unknown>> {
  const flat = await getTranslations(language, namespace);
  const nested: Record<string, unknown> = {};

  for (const [keyPath, value] of Object.entries(flat)) {
    const keys = keyPath.split(".");
    let current: Record<string, unknown> = nested;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  return nested;
}

/**
 * Get a single translation by key path
 */
export async function getTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
): Promise<TranslationRecord | undefined> {
  return (await db(TRANSLATIONS_TABLE)
    .where({
      language,
      namespace,
      key_path: keyPath,
    })
    .first()) as TranslationRecord | undefined;
}

/**
 * Create a new translation
 */
export async function createTranslation(
  data: TranslationInsert,
  trx?: Knex.Transaction,
): Promise<TranslationRecord> {
  const [record] = (await withDb(trx)(TRANSLATIONS_TABLE).insert(data).returning("*")) as [
    TranslationRecord,
  ];
  return record;
}

/**
 * Update an existing translation
 */
export async function updateTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  updates: TranslationUpdate,
  trx?: Knex.Transaction,
): Promise<TranslationRecord | undefined> {
  const [record] = (await withDb(trx)(TRANSLATIONS_TABLE)
    .where({
      language,
      namespace,
      key_path: keyPath,
    })
    .update({
      ...updates,
      updated_at: db.fn.now(),
    })
    .returning("*")) as [TranslationRecord] | [];

  return record;
}

/**
 * Upsert a translation (insert or update)
 */
export async function upsertTranslation(
  data: TranslationInsert,
  trx?: Knex.Transaction,
): Promise<TranslationRecord> {
  const [record] = (await withDb(trx)(TRANSLATIONS_TABLE)
    .insert(data)
    .onConflict(["namespace", "key_path", "language"])
    .merge({
      value: db.raw("EXCLUDED.value"),
      updated_by: db.raw("EXCLUDED.updated_by"),
      updated_at: db.fn.now(),
    })
    .returning("*")) as [TranslationRecord];

  return record;
}

/**
 * Delete a translation
 */
export async function deleteTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const deleted = await withDb(trx)(TRANSLATIONS_TABLE)
    .where({
      language,
      namespace,
      key_path: keyPath,
    })
    .delete();

  return deleted > 0;
}

/**
 * List all translations with pagination
 */
export async function listTranslations(
  filters?: {
    language?: SupportedLanguage;
    namespace?: TranslationNamespace;
    search?: string;
  },
  pagination?: {
    limit?: number;
    offset?: number;
  },
): Promise<{ translations: TranslationRecord[]; total: number }> {
  let query = db(TRANSLATIONS_TABLE).select("*");

  if (filters?.language) {
    query = query.where("language", filters.language);
  }

  if (filters?.namespace) {
    query = query.where("namespace", filters.namespace);
  }

  if (filters?.search) {
    query = query.where(function () {
      this.where("key_path", "ilike", `%${filters.search}%`).orWhere(
        "value",
        "ilike",
        `%${filters.search}%`,
      );
    });
  }

  // Get total count
  const countQuery = query.clone().clearSelect().clearOrder().count("* as total").first();
  const { total } = (await countQuery) as { total: string | number };
  const totalCount = typeof total === "string" ? parseInt(total, 10) : total;

  // Apply pagination
  if (pagination?.limit) {
    query = query.limit(pagination.limit);
  }
  if (pagination?.offset) {
    query = query.offset(pagination.offset);
  }

  query = query.orderBy("namespace").orderBy("key_path").orderBy("language");

  const translations = (await query) as TranslationRecord[];

  return {
    translations,
    total: totalCount,
  };
}
