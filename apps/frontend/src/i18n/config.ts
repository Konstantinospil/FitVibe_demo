import i18n from "i18next";
import { initReactI18next } from "react-i18next";

type SupportedLanguage = "en" | "de" | "fr" | "es" | "el";

const mergeTranslations = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  extra: U,
) => ({ ...base, ...extra });

const resources: Partial<Record<SupportedLanguage, { translation: Record<string, unknown> }>> = {};

const FALLBACK_LANGUAGE: SupportedLanguage = "en";
// Use relative URL in development (Vite proxy handles /api -> localhost:4000)
// Use full URL in production or when VITE_API_URL is explicitly set
const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "http://localhost:4000");
const TRANSLATIONS_CACHE_KEY = "fitvibe:translations:cache";
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CachedTranslations {
  data: Record<string, unknown>;
  timestamp: number;
  language: SupportedLanguage;
}

/**
 * Load translations from API
 */
async function loadTranslationsFromAPI(
  lng: SupportedLanguage,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/translations/${lng}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for CSRF if needed
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(`Failed to load translations from API for ${lng}:`, error);
    return null;
  }
}

/**
 * Load translations from JSON files (fallback)
 */
async function loadTranslationsFromJSON(lng: SupportedLanguage): Promise<Record<string, unknown>> {
  try {
    const [common, auth, terms, privacy, cookie] = await Promise.all([
      import(`./locales/${lng}/common.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/auth.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/terms.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/privacy.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/cookie.json`) as Promise<{ default: Record<string, unknown> }>,
    ]);

    const wrappedTerms = { terms: terms.default };
    const wrappedPrivacy = { privacy: privacy.default };
    const wrappedCookie = { cookie: cookie.default };

    return mergeTranslations(
      mergeTranslations(
        mergeTranslations(mergeTranslations(common.default, auth.default), wrappedTerms),
        wrappedPrivacy,
      ),
      wrappedCookie,
    );
  } catch (error) {
    console.warn(`Failed to load JSON translations for ${lng}:`, error);
    throw error;
  }
}

/**
 * Get cached translations from localStorage
 */
function getCachedTranslations(lng: SupportedLanguage): CachedTranslations | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cacheKey = `${TRANSLATIONS_CACHE_KEY}:${lng}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as CachedTranslations;
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsed.timestamp > CACHE_DURATION_MS || parsed.language !== lng) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Cache translations in localStorage
 */
function cacheTranslations(lng: SupportedLanguage, data: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheKey = `${TRANSLATIONS_CACHE_KEY}:${lng}`;
    const cached: CachedTranslations = {
      data,
      timestamp: Date.now(),
      language: lng,
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.warn("Failed to cache translations:", error);
  }
}

/**
 * Load translations (API first, then JSON fallback)
 */
async function loadLanguage(lng: SupportedLanguage): Promise<void> {
  // Check if translations are already loaded with all required namespaces
  // For English, we may have minimal translations loaded first, so we need to check
  if (resources[lng]) {
    const existingTranslations = resources[lng].translation;
    // Check if we have all required namespaces (terms, privacy, cookie indicate full load)
    if (
      existingTranslations &&
      typeof existingTranslations === "object" &&
      "terms" in existingTranslations &&
      "privacy" in existingTranslations &&
      "cookie" in existingTranslations
    ) {
      return; // Already loaded with full translations
    }
    // If we only have minimal translations, continue to load full translations
  }

  try {
    // Try cached translations first
    const cached = getCachedTranslations(lng);
    if (cached) {
      console.warn(`Using cached translations for ${lng}`);
      i18n.addResourceBundle(lng, "translation", cached.data, true, true);
      resources[lng] = { translation: cached.data };
      return;
    }

    // Try API first
    let translations = await loadTranslationsFromAPI(lng);

    // Check if translations are empty (e.g., {terms:{}, privacy:{}, cookie:{}})
    const isEmpty =
      !translations ||
      (typeof translations === "object" &&
        "terms" in translations &&
        "privacy" in translations &&
        "cookie" in translations &&
        Object.keys(translations.terms as Record<string, unknown>).length === 0 &&
        Object.keys(translations.privacy as Record<string, unknown>).length === 0 &&
        Object.keys(translations.cookie as Record<string, unknown>).length === 0);

    // Fallback to JSON if API fails or returns empty translations
    if (!translations || isEmpty) {
      console.warn(
        `Falling back to JSON translations for ${lng}${isEmpty ? " (API returned empty translations)" : ""}`,
      );
      translations = await loadTranslationsFromJSON(lng);
    } else {
      // Cache successful API responses
      cacheTranslations(lng, translations);
    }

    i18n.addResourceBundle(lng, "translation", translations, true, true);
    resources[lng] = { translation: translations };
  } catch (error) {
    console.warn(`Failed to load language ${lng}:`, error);
    // Fallback to English if language loading fails
    if (lng !== "en") {
      await loadLanguage("en");
    }
  }
}

const detectLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") {
    return FALLBACK_LANGUAGE;
  }

  const stored = window.localStorage.getItem("fitvibe:language") as SupportedLanguage | null;
  if (stored && stored in resources) {
    return stored;
  }

  const browser = window.navigator?.language?.slice(0, 2) as SupportedLanguage | undefined;
  if (browser && browser in resources) {
    return browser;
  }

  return FALLBACK_LANGUAGE;
};

const initialLanguage = detectLanguage();

// Initialize i18n
void i18n.use(initReactI18next).init({
  resources: {},
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

// Load minimal translations for login page (use JSON for speed)
const loadMinimalLoginTranslations = async () => {
  const [enCommon, enAuth] = await Promise.all([
    import("./locales/en/common.json") as Promise<{ default: Record<string, unknown> }>,
    import("./locales/en/auth.json") as Promise<{ default: Record<string, unknown> }>,
  ]);

  const minimalTranslations = mergeTranslations(enCommon.default, enAuth.default);
  i18n.addResourceBundle("en", "translation", minimalTranslations, true, true);
  resources.en = { translation: minimalTranslations };
  void i18n.changeLanguage("en");
};

// Load full translations after initial render
export const translationsLoadingPromise = Promise.resolve()
  .then(() => {
    return loadMinimalLoginTranslations();
  })
  .then(() => {
    if (typeof window !== "undefined" && window.requestIdleCallback) {
      return new Promise<void>((resolve) => {
        window.requestIdleCallback(
          () => {
            void loadLanguage("en").then(() => {
              if (initialLanguage !== "en") {
                return loadLanguage(initialLanguage).then(() => {
                  void i18n.changeLanguage(initialLanguage);
                  resolve();
                });
              } else {
                void i18n.changeLanguage("en");
                resolve();
              }
            });
          },
          { timeout: 2000 },
        );
      });
    } else {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          void loadLanguage("en").then(() => {
            if (initialLanguage !== "en") {
              return loadLanguage(initialLanguage).then(() => {
                void i18n.changeLanguage(initialLanguage);
                resolve();
              });
            } else {
              void i18n.changeLanguage("en");
              resolve();
            }
          });
        }, 100);
      });
    }
  });

export const loadLanguageTranslations = loadLanguage;

export const ensurePrivateTranslationsLoaded = async () => {
  return Promise.resolve();
};

if (typeof window !== "undefined") {
  i18n.on("languageChanged", (lng) => {
    window.localStorage.setItem("fitvibe:language", lng);
    // Clear translation cache when language changes to force fresh load
    const cacheKey = `${TRANSLATIONS_CACHE_KEY}:${lng}`;
    window.localStorage.removeItem(cacheKey);
  });
}

export default i18n;
