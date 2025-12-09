import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// Load English translations eagerly (needed for login page)
// Use dynamic imports to allow Vite to code-split properly
const loadEnglishTranslations = async () => {
  const [enCommon, enAuth, enTerms, enPrivacy] = await Promise.all([
    import("./locales/en/common.json") as Promise<{ default: Record<string, unknown> }>,
    import("./locales/en/auth.json") as Promise<{ default: Record<string, unknown> }>,
    import("./locales/en/terms.json") as Promise<{ default: Record<string, unknown> }>,
    import("./locales/en/privacy.json") as Promise<{ default: Record<string, unknown> }>,
  ]);

  return mergeTranslations(
    mergeTranslations(mergeTranslations(enCommon.default, enAuth.default), enTerms.default),
    enPrivacy.default,
  );
};

type SupportedLanguage = "en" | "de" | "fr" | "es" | "el";

const mergeTranslations = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  extra: U,
) => ({ ...base, ...extra });

// Resources will be populated after loading translations
const resources: Partial<Record<SupportedLanguage, { translation: Record<string, unknown> }>> = {};

const FALLBACK_LANGUAGE: SupportedLanguage = "en";

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

// Load translations on-demand (including English) to reduce initial bundle size
const loadLanguage = async (lng: SupportedLanguage): Promise<void> => {
  if (resources[lng]) {
    return; // Already loaded
  }

  try {
    // Dynamically import translation files only when needed
    // This includes English to allow proper code-splitting
    const [common, auth, terms, privacy] = await Promise.all([
      import(`./locales/${lng}/common.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/auth.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/terms.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/privacy.json`) as Promise<{ default: Record<string, unknown> }>,
    ]);

    const translations = mergeTranslations(
      mergeTranslations(mergeTranslations(common.default, auth.default), terms.default),
      privacy.default,
    );

    i18n.addResourceBundle(lng, "translation", translations, true, true);
    resources[lng] = { translation: translations };
  } catch (error) {
    console.warn(`Failed to load language ${lng}:`, error);
    // Fallback to English if language loading fails
    if (lng !== "en") {
      // Try to load English as fallback
      await loadLanguage("en");
    }
  }
};

// Initialize i18n with empty resources, then load English immediately
void i18n.use(initReactI18next).init({
  resources: {},
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

// Load English translations immediately (needed for login page)
// This is done asynchronously but eagerly to allow code-splitting
void loadEnglishTranslations().then((enTranslations) => {
  i18n.addResourceBundle("en", "translation", enTranslations, true, true);
  resources.en = { translation: enTranslations };

  // If initial language is not English, load it too
  if (initialLanguage !== "en") {
    void loadLanguage(initialLanguage).then(() => {
      void i18n.changeLanguage(initialLanguage);
    });
  } else {
    // Ensure English is set as the language
    void i18n.changeLanguage("en");
  }
});

// Export function to load languages on-demand
export const loadLanguageTranslations = loadLanguage;

export const ensurePrivateTranslationsLoaded = async () => {
  // All known bundles are eagerly loaded, but keep the API asynchronous-friendly
  // so routes that call this function do not need to change once new bundles appear.
  return Promise.resolve();
};

if (typeof window !== "undefined") {
  i18n.on("languageChanged", (lng) => {
    window.localStorage.setItem("fitvibe:language", lng);
  });
}

export default i18n;
