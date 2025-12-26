import { apiClient } from "./api.js";

export type SupportedLanguage = "en" | "de" | "fr" | "es" | "el";
export type TranslationNamespace = "common" | "auth" | "terms" | "privacy" | "cookie";

export interface TranslationRecord {
  id: string;
  namespace: TranslationNamespace;
  key_path: string;
  language: SupportedLanguage;
  value: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface TranslationsResponse {
  [key: string]: string | TranslationsResponse;
}

export interface ListTranslationsParams {
  language?: SupportedLanguage;
  namespace?: TranslationNamespace;
  search?: string;
  keyPath?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListTranslationsResponse {
  data: TranslationRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface CreateTranslationDTO {
  namespace: TranslationNamespace;
  key_path: string;
  language: SupportedLanguage;
  value: string;
}

export interface UpdateTranslationDTO {
  value: string;
}

export interface BulkUpdateTranslationDTO {
  namespace: TranslationNamespace;
  key_path: string;
  translations: Record<SupportedLanguage, string>;
}

/**
 * Get all translations for a language (public endpoint)
 */
export async function getTranslations(
  language: SupportedLanguage,
  namespace?: TranslationNamespace,
): Promise<TranslationsResponse> {
  const params = namespace ? { namespace } : {};
  const res = await apiClient.get<TranslationsResponse>(`/api/v1/translations/${language}`, {
    params,
  });
  return res.data;
}

/**
 * List translations with filters (admin endpoint)
 */
export async function listTranslations(
  params?: ListTranslationsParams,
): Promise<ListTranslationsResponse> {
  const res = await apiClient.get<ListTranslationsResponse>("/api/v1/translations", { params });
  return res.data;
}

/**
 * Create a new translation (admin endpoint)
 */
export async function createTranslation(dto: CreateTranslationDTO): Promise<TranslationRecord> {
  const res = await apiClient.post<TranslationRecord>("/api/v1/translations", dto);
  return res.data;
}

/**
 * Update an existing translation (admin endpoint)
 */
export async function updateTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
  dto: UpdateTranslationDTO,
): Promise<TranslationRecord> {
  // Encode dots in keyPath for URL
  const encodedKeyPath = encodeURIComponent(keyPath);
  const res = await apiClient.put<TranslationRecord>(
    `/api/v1/translations/${language}/${namespace}/${encodedKeyPath}`,
    dto,
  );
  return res.data;
}

/**
 * Bulk update translations for a key across multiple languages (admin endpoint)
 */
export async function bulkUpdateTranslation(
  dto: BulkUpdateTranslationDTO,
): Promise<{ translations: TranslationRecord[] }> {
  const res = await apiClient.post<{ translations: TranslationRecord[] }>(
    "/api/v1/translations/bulk",
    dto,
  );
  return res.data;
}

/**
 * Delete a translation (admin endpoint)
 */
export async function deleteTranslation(
  language: SupportedLanguage,
  namespace: TranslationNamespace,
  keyPath: string,
): Promise<void> {
  // Encode dots in keyPath for URL
  const encodedKeyPath = encodeURIComponent(keyPath);
  await apiClient.delete(`/api/v1/translations/${language}/${namespace}/${encodedKeyPath}`);
}
