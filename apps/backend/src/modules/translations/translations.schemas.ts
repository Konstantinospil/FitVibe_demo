import { z } from "zod";

const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "el"] as const;
const TRANSLATION_NAMESPACES = ["common", "auth", "terms", "privacy", "cookie"] as const;

export const SupportedLanguageSchema = z.enum(SUPPORTED_LANGUAGES);
export const TranslationNamespaceSchema = z.enum(TRANSLATION_NAMESPACES);

export const GetTranslationsParamsSchema = z.object({
  language: SupportedLanguageSchema,
});

export const GetTranslationsQuerySchema = z.object({
  namespace: TranslationNamespaceSchema.optional(),
});

export const CreateTranslationSchema = z.object({
  namespace: TranslationNamespaceSchema,
  key_path: z.string().min(1).max(500),
  language: SupportedLanguageSchema,
  value: z.string().min(1),
});

export const UpdateTranslationSchema = z.object({
  value: z.string().min(1),
});

export const BulkUpdateTranslationSchema = z.object({
  namespace: TranslationNamespaceSchema,
  key_path: z.string().min(1).max(500),
  translations: z.record(SupportedLanguageSchema, z.string().min(1)),
});

export const ListTranslationsQuerySchema = z.object({
  language: SupportedLanguageSchema.optional(),
  namespace: TranslationNamespaceSchema.optional(),
  search: z.string().optional(),
  keyPath: z.string().optional(),
  activeOnly: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") {
      return undefined;
    }
    if (typeof val === "boolean") {
      return val;
    }
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      // "false" means show all (including deleted), anything else means show only active
      if (lower === "false" || lower === "0") {
        return false;
      }
      return true;
    }
    return undefined;
  }, z.boolean().optional()),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const TranslationParamsSchema = z.object({
  language: SupportedLanguageSchema,
  namespace: TranslationNamespaceSchema,
  keyPath: z.string().min(1),
});
