import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// Only load English translations eagerly (default language)
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enTerms from "./locales/en/terms.json";
import enPrivacy from "./locales/en/privacy.json";

type SupportedLanguage = "en" | "de" | "fr" | "es" | "el";

const mergeTranslations = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  extra: U,
) => ({ ...base, ...extra });

// Only load English (default) translations eagerly
// Other languages will be loaded on-demand via dynamic imports
const resources: Record<SupportedLanguage, { translation: Record<string, unknown> }> = {
  en: {
    translation: mergeTranslations(
      mergeTranslations(mergeTranslations(enCommon, enAuth), enTerms),
      enPrivacy,
    ) as Record<string, unknown>,
  },
};

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

// Lazy load non-English translations on-demand
const loadLanguage = async (lng: SupportedLanguage): Promise<void> => {
  if (lng === "en" || resources[lng]) {
    return; // Already loaded
  }

  try {
    // Dynamically import translation files only when needed
    const [common, auth, terms, privacy] = await Promise.all([
      import(`./locales/${lng}/common.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/auth.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/terms.json`) as Promise<{ default: Record<string, unknown> }>,
      import(`./locales/${lng}/privacy.json`) as Promise<{ default: Record<string, unknown> }>,
    ]);

    i18n.addResourceBundle(
      lng,
      "translation",
      mergeTranslations(
        mergeTranslations(mergeTranslations(common.default, auth.default), terms.default),
        privacy.default,
      ),
      true,
      true,
    );
  } catch (error) {
    console.warn(`Failed to load language ${lng}:`, error);
    // Fallback to English if language loading fails
  }
};

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage === "en" ? "en" : FALLBACK_LANGUAGE, // Only use en if detected, fallback otherwise
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

// Load the detected language if it's not English
if (initialLanguage !== "en") {
  void loadLanguage(initialLanguage).then(() => {
    void i18n.changeLanguage(initialLanguage);
  });
}

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
