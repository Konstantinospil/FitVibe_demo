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
 * Only returns active (non-deleted) translations
 */
export async function getTranslations(
  language: SupportedLanguage,
  namespace?: TranslationNamespace,
): Promise<Record<string, string>> {
  // Get only the latest active version for each key_path
  let query = db(TRANSLATIONS_TABLE)
    .select("key_path", "value")
    .where("language", language)
    .whereNull("deleted_at");

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
 * Returns active or deleted translations
 */
export async function getTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  includeDeleted = false,
): Promise<TranslationRecord | undefined> {
  let query = db(TRANSLATIONS_TABLE).where({
    language,
    namespace,
    key_path: keyPath,
  });

  if (!includeDeleted) {
    query = query.whereNull("deleted_at");
  }

  return (await query.first()) as TranslationRecord | undefined;
}

/**
 * Create a new translation
 * If a deleted translation exists, restores it by making it active again
 * With the partial unique index, we can check for deleted translations and restore them
 */
export async function createTranslation(
  data: TranslationInsert,
  trx?: Knex.Transaction,
): Promise<TranslationRecord> {
  const dbInstance = withDb(trx);

  // Check if there's an active translation - if so, update it (creates new version)
  const active = await dbInstance(TRANSLATIONS_TABLE)
    .where({
      language: data.language,
      namespace: data.namespace,
      key_path: data.key_path,
    })
    .whereNull("deleted_at")
    .first<TranslationRecord>();

  if (active) {
    // If an active translation exists, update it (which creates a new version)
    // This makes the API more user-friendly for bulk operations like "Save all languages"
    const updated = await updateTranslation(
      data.language,
      data.namespace,
      data.key_path,
      { value: data.value },
      data.updated_by ?? null,
      trx,
    );
    // updateTranslation should always return a record since we verified active exists
    if (!updated) {
      throw new Error(
        `Failed to update active translation for ${data.namespace}.${data.key_path} (${data.language})`,
      );
    }
    return updated;
  }

  // Check if there's a deleted translation - if so, restore it
  const deleted = await dbInstance(TRANSLATIONS_TABLE)
    .where({
      language: data.language,
      namespace: data.namespace,
      key_path: data.key_path,
    })
    .whereNotNull("deleted_at")
    .orderBy("deleted_at", "desc") // Get the most recently deleted one
    .first<TranslationRecord>();

  if (deleted) {
    // Restore the deleted translation by making it active again
    const [record] = (await dbInstance(TRANSLATIONS_TABLE)
      .where({
        language: data.language,
        namespace: data.namespace,
        key_path: data.key_path,
        id: deleted.id, // Update the specific deleted record
      })
      .update({
        value: data.value,
        deleted_at: null, // Restore by making it active
        updated_at: db.fn.now(),
        updated_by: data.updated_by ?? null,
        // Keep original created_at and created_by for audit trail
      })
      .returning("*")) as [TranslationRecord];

    if (!record) {
      throw new Error(
        `Failed to restore deleted translation for ${data.namespace}.${data.key_path} (${data.language})`,
      );
    }

    return record;
  }

  // No existing translation (active or deleted) - create new one
  const [record] = (await dbInstance(TRANSLATIONS_TABLE).insert(data).returning("*")) as [
    TranslationRecord,
  ];
  return record;
}

/**
 * Update an existing translation
 * Creates a new version: marks old record as deleted and creates a new one
 */
export async function updateTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  updates: TranslationUpdate,
  userId?: string | null,
  trx?: Knex.Transaction,
): Promise<TranslationRecord | undefined> {
  const dbInstance = withDb(trx);

  // Get the current active translation
  const existing = await dbInstance(TRANSLATIONS_TABLE)
    .where({
      language,
      namespace,
      key_path: keyPath,
    })
    .whereNull("deleted_at")
    .first<TranslationRecord>();

  if (!existing) {
    return undefined;
  }

  // Use transaction if provided, otherwise start a new one
  const executeUpdate = async (transaction: Knex.Transaction) => {
    const now = new Date();
    const deletedAt = now;
    const createdAt = now; // Use same timestamp as deletion for clear audit trail

    // Mark old record as deleted
    await transaction(TRANSLATIONS_TABLE)
      .where({ id: existing.id })
      .update({
        deleted_at: deletedAt.toISOString(),
        updated_at: deletedAt.toISOString(),
        updated_by: userId ?? null,
      });

    // Create new record with updated value
    const [newRecord] = (await transaction(TRANSLATIONS_TABLE)
      .insert({
        namespace: existing.namespace,
        key_path: existing.key_path,
        language: existing.language,
        value: updates.value ?? existing.value,
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
        created_by: userId ?? existing.created_by,
        updated_by: userId ?? null,
      })
      .returning("*")) as [TranslationRecord];

    return newRecord;
  };

  if (trx) {
    // Use existing transaction
    return await executeUpdate(trx);
  } else {
    // Start new transaction
    return await db.transaction(async (transaction) => {
      return await executeUpdate(transaction);
    });
  }
}

/**
 * Upsert a translation (insert or update)
 * If a deleted translation exists, restores it by setting deleted_at to null
 */
export async function upsertTranslation(
  data: TranslationInsert,
  trx?: Knex.Transaction,
): Promise<TranslationRecord> {
  const dbInstance = withDb(trx);

  // Check if there's a deleted translation that should be restored
  const deleted = await dbInstance(TRANSLATIONS_TABLE)
    .where({
      language: data.language,
      namespace: data.namespace,
      key_path: data.key_path,
    })
    .whereNotNull("deleted_at")
    .orderBy("deleted_at", "desc") // Get the most recently deleted one
    .first<TranslationRecord>();

  if (deleted) {
    // Restore the deleted translation by making it active again
    const [record] = (await dbInstance(TRANSLATIONS_TABLE)
      .where({
        language: data.language,
        namespace: data.namespace,
        key_path: data.key_path,
        id: deleted.id, // Update the specific deleted record
      })
      .update({
        value: data.value,
        deleted_at: null, // Restore by making it active
        updated_at: db.fn.now(),
        updated_by: data.updated_by ?? null,
        // Keep original created_at and created_by for audit trail
      })
      .returning("*")) as [TranslationRecord];

    if (!record) {
      throw new Error(
        `Failed to restore deleted translation for ${data.namespace}.${data.key_path} (${data.language})`,
      );
    }

    return record;
  }

  // Check if there's an active translation - if so, update it
  const active = await dbInstance(TRANSLATIONS_TABLE)
    .where({
      language: data.language,
      namespace: data.namespace,
      key_path: data.key_path,
    })
    .whereNull("deleted_at")
    .first<TranslationRecord>();

  if (active) {
    // Update the existing active translation
    const [record] = (await dbInstance(TRANSLATIONS_TABLE)
      .where({ id: active.id })
      .update({
        value: data.value,
        updated_at: db.fn.now(),
        updated_by: data.updated_by ?? null,
        deleted_at: null, // Ensure deleted_at is null
      })
      .returning("*")) as [TranslationRecord];

    if (!record) {
      throw new Error(
        `Failed to update active translation for ${data.namespace}.${data.key_path} (${data.language})`,
      );
    }

    return record;
  }

  // No active or deleted record exists - create new one
  const [record] = (await dbInstance(TRANSLATIONS_TABLE).insert(data).returning("*")) as [
    TranslationRecord,
  ];

  return record;
}

/**
 * Soft delete a translation
 */
export async function deleteTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const updated = await withDb(trx)(TRANSLATIONS_TABLE)
    .where({
      language,
      namespace,
      key_path: keyPath,
    })
    .whereNull("deleted_at")
    .update({
      deleted_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

  return updated > 0;
}

/**
 * List all translations with pagination
 */
export async function listTranslations(
  filters?: {
    language?: SupportedLanguage;
    namespace?: TranslationNamespace;
    search?: string;
    keyPath?: string;
    activeOnly?: boolean;
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

  if (filters?.keyPath) {
    query = query.where("key_path", "ilike", `%${filters.keyPath}%`);
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

  // Filter by active status
  // Default: show only active records (deleted_at IS NULL)
  // When activeOnly is explicitly false, show all records (including deleted)
  // When activeOnly is true or undefined, show only active records
  if (filters?.activeOnly === false) {
    // Show all including deleted - no filter applied
  } else {
    // Default: show only active (deleted_at IS NULL)
    query = query.whereNull("deleted_at");
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

  // Order by language, namespace, key_path for consistent display
  query = query.orderBy("language").orderBy("namespace").orderBy("key_path");

  const translations = (await query) as TranslationRecord[];

  return {
    translations,
    total: totalCount,
  };
}
