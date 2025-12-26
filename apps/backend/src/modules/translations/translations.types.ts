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

export interface TranslationInsert {
  namespace: TranslationNamespace;
  key_path: string;
  language: SupportedLanguage;
  value: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface TranslationUpdate {
  value?: string;
  updated_by?: string | null;
}

export interface TranslationsResponse {
  [key: string]: string | TranslationsResponse;
}

export interface TranslationQuery {
  language: SupportedLanguage;
  namespace?: TranslationNamespace;
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
  translations: Partial<Record<SupportedLanguage, string>>;
}
