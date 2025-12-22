import {
  getTranslationsNested,
  getTranslation,
  createTranslation,
  updateTranslation,
  upsertTranslation,
  deleteTranslation,
  listTranslations,
} from "./translations.repository.js";
import type {
  SupportedLanguage,
  TranslationNamespace,
  CreateTranslationDTO,
  UpdateTranslationDTO,
  BulkUpdateTranslationDTO,
  TranslationRecord,
} from "./translations.types.js";
import { HttpError } from "../../utils/http.js";

/**
 * Get translations for a language and optional namespace
 * Returns nested object structure compatible with i18next
 */
export async function getLanguageTranslations(
  language: SupportedLanguage,
  namespace?: TranslationNamespace,
): Promise<Record<string, unknown>> {
  return getTranslationsNested(language, namespace);
}

/**
 * Get all namespaces for a language merged together
 */
export async function getAllTranslationsForLanguage(
  language: SupportedLanguage,
): Promise<Record<string, unknown>> {
  const namespaces: TranslationNamespace[] = ["common", "auth", "terms", "privacy", "cookie"];

  const allTranslations: Record<string, unknown> = {};

  for (const ns of namespaces) {
    const nsTranslations = await getTranslationsNested(language, ns);
    if (ns === "terms") {
      allTranslations.terms = nsTranslations;
    } else if (ns === "privacy") {
      allTranslations.privacy = nsTranslations;
    } else if (ns === "cookie") {
      allTranslations.cookie = nsTranslations;
    } else {
      // Merge common and auth at root level
      Object.assign(allTranslations, nsTranslations);
    }
  }

  return allTranslations;
}

/**
 * Create a new translation
 */
export async function createTranslationService(
  dto: CreateTranslationDTO,
  userId?: string,
): Promise<TranslationRecord> {
  return createTranslation({
    ...dto,
    created_by: userId ?? null,
    updated_by: userId ?? null,
  });
}

/**
 * Update an existing translation
 */
export async function updateTranslationService(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  dto: UpdateTranslationDTO,
  userId?: string,
): Promise<TranslationRecord> {
  const existing = await getTranslation(language, namespace, keyPath);
  if (!existing) {
    throw new HttpError(404, "TRANSLATION_NOT_FOUND", "Translation not found");
  }

  const updated = await updateTranslation(language, namespace, keyPath, {
    value: dto.value,
    updated_by: userId ?? null,
  });

  if (!updated) {
    throw new HttpError(500, "TRANSLATION_UPDATE_FAILED", "Failed to update translation");
  }

  return updated;
}

/**
 * Bulk update translations for a key across multiple languages
 */
export async function bulkUpdateTranslationService(
  dto: BulkUpdateTranslationDTO,
  userId?: string,
): Promise<TranslationRecord[]> {
  const results: TranslationRecord[] = [];

  for (const [language, value] of Object.entries(dto.translations)) {
    const result = await upsertTranslation({
      namespace: dto.namespace,
      key_path: dto.key_path,
      language: language as SupportedLanguage,
      value,
      updated_by: userId ?? null,
    });
    results.push(result);
  }

  return results;
}

/**
 * Delete a translation
 */
export async function deleteTranslationService(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
): Promise<void> {
  const deleted = await deleteTranslation(language, namespace, keyPath);
  if (!deleted) {
    throw new HttpError(404, "TRANSLATION_NOT_FOUND", "Translation not found");
  }
}

/**
 * List translations with filters and pagination
 */
export async function listTranslationsService(params?: {
  language?: SupportedLanguage;
  namespace?: TranslationNamespace;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ translations: TranslationRecord[]; total: number }> {
  return listTranslations(
    {
      language: params?.language,
      namespace: params?.namespace,
      search: params?.search,
    },
    {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    },
  );
}
