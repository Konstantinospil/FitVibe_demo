import {
  getTranslationsNested,
  getTranslation,
  createTranslation,
  updateTranslation,
  upsertTranslation,
  deleteTranslation,
  listTranslations,
  getLatestNamespaceUpdates,
  getTranslationMetadata,
  getNamespacesForLanguage,
  updateMeasurementAttributeLabel,
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
import { insertAudit } from "../common/audit.util.js";

const ATTRIBUTE_NAMESPACE = "user_attributes";
const DEFAULT_ATTRIBUTE_LANGUAGE = "en";

function attributeKeyFromPath(keyPath: string): string | null {
  if (!keyPath.startsWith(`${ATTRIBUTE_NAMESPACE}.`)) {
    return null;
  }
  return keyPath.slice(`${ATTRIBUTE_NAMESPACE}.`.length);
}

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
  const namespaces = await getNamespacesForLanguage(language);

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
  const record = await createTranslation({
    ...dto,
    created_by: userId ?? null,
    updated_by: userId ?? null,
  });
  if (dto.namespace === ATTRIBUTE_NAMESPACE && dto.language === DEFAULT_ATTRIBUTE_LANGUAGE) {
    const key = attributeKeyFromPath(dto.key_path);
    if (key) {
      await updateMeasurementAttributeLabel(key, dto.value);
      await insertAudit({
        actorUserId: userId ?? null,
        entity: "measurement_attributes",
        action: "rename",
        entityId: key,
        metadata: { namespace: dto.namespace, key_path: dto.key_path, label: dto.value },
      });
    }
  }
  return record;
}

/**
 * Update an existing translation
 * Creates a new version: marks old record as deleted and creates a new one
 */
export async function updateTranslationService(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  dto: UpdateTranslationDTO,
  userId?: string,
): Promise<TranslationRecord> {
  const existing = await getTranslation(language, namespace, keyPath, false);
  if (!existing) {
    throw new HttpError(404, "TRANSLATION_NOT_FOUND", "Translation not found");
  }

  const updated = await updateTranslation(
    language,
    namespace,
    keyPath,
    {
      value: dto.value,
    },
    userId,
  );

  if (!updated) {
    throw new HttpError(500, "TRANSLATION_UPDATE_FAILED", "Failed to update translation");
  }

  if (namespace === ATTRIBUTE_NAMESPACE && language === DEFAULT_ATTRIBUTE_LANGUAGE) {
    const key = attributeKeyFromPath(keyPath);
    if (key) {
      await updateMeasurementAttributeLabel(key, dto.value);
      await insertAudit({
        actorUserId: userId ?? null,
        entity: "measurement_attributes",
        action: "rename",
        entityId: key,
        metadata: { namespace, key_path: keyPath, label: dto.value },
      });
    }
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
  const key = attributeKeyFromPath(dto.key_path);
  const enValue = dto.translations[DEFAULT_ATTRIBUTE_LANGUAGE];

  for (const [language, value] of Object.entries(dto.translations)) {
    if (value === undefined) {
      continue;
    }
    const result = await upsertTranslation({
      namespace: dto.namespace,
      key_path: dto.key_path,
      language: language,
      value,
      updated_by: userId ?? null,
    });
    results.push(result);
  }

  if (dto.namespace === ATTRIBUTE_NAMESPACE && key && typeof enValue === "string") {
    await updateMeasurementAttributeLabel(key, enValue);
    await insertAudit({
      actorUserId: userId ?? null,
      entity: "measurement_attributes",
      action: "rename",
      entityId: key,
      metadata: { namespace: dto.namespace, key_path: dto.key_path, label: enValue },
    });
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
  keyPath?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ translations: TranslationRecord[]; total: number }> {
  return listTranslations(
    {
      language: params?.language,
      namespace: params?.namespace,
      search: params?.search,
      keyPath: params?.keyPath,
      activeOnly: params?.activeOnly,
    },
    {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    },
  );
}

export async function getLatestNamespaceUpdatesService(): Promise<
  Array<{ namespace: TranslationNamespace; updated_at: string | null }>
> {
  return getLatestNamespaceUpdates();
}

export async function getTranslationMetadataService(): Promise<{
  languages: SupportedLanguage[];
  namespaces: TranslationNamespace[];
}> {
  return getTranslationMetadata();
}
