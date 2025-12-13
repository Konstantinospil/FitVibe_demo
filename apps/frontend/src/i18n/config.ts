import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// Load minimal English translations for login page only
// This reduces initial bundle size significantly
export const loadMinimalLoginTranslations = async () => {
  // Only load auth.json for login page - other translations loaded on-demand
  const enAuthModule = await import("./locales/en/auth.json");
  const enAuth = enAuthModule.default as Record<string, unknown>;

  // Create minimal common translations object with only what's needed for login
  const minimalCommon = {
    language: {
      label: "Language",
      english: "English",
      german: "German",
      spanish: "Spanish",
      french: "French",
      greek: "Greek",
    },
  };

  return mergeTranslations(minimalCommon, enAuth);
};

// Load full English translations (for other pages)
const loadFullEnglishTranslations = async () => {
  const [enCommonModule, enAuthModule, enTermsModule, enPrivacyModule] = await Promise.all([
    import("./locales/en/common.json"),
    import("./locales/en/auth.json"),
    import("./locales/en/terms.json"),
    import("./locales/en/privacy.json"),
  ]);

  const enCommon = enCommonModule.default as Record<string, unknown>;
  const enAuth = enAuthModule.default as Record<string, unknown>;
  const enTerms = enTermsModule.default as Record<string, unknown>;
  const enPrivacy = enPrivacyModule.default as Record<string, unknown>;

  return mergeTranslations(
    mergeTranslations(mergeTranslations(enCommon, enAuth), enTerms),
    enPrivacy,
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
    const modules = await Promise.all([
      import(`./locales/${lng}/common.json`),
      import(`./locales/${lng}/auth.json`),
      import(`./locales/${lng}/terms.json`),
      import(`./locales/${lng}/privacy.json`),
    ]);

    const commonModule = modules[0] as { default: Record<string, unknown> };
    const authModule = modules[1] as { default: Record<string, unknown> };
    const termsModule = modules[2] as { default: Record<string, unknown> };
    const privacyModule = modules[3] as { default: Record<string, unknown> };

    const common = commonModule.default;
    const auth = authModule.default;
    const terms = termsModule.default;
    const privacy = privacyModule.default;

    const translations = mergeTranslations(
      mergeTranslations(mergeTranslations(common, auth), terms),
      privacy,
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

// Initialize i18n - use initReactI18next for both client and server
// Components use useTranslation hook which requires the React plugin
// I18nextProvider will provide the context during SSR
void i18n.use(initReactI18next).init({
  resources: {},
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  // SSR-safe: disable React suspense for server-side rendering
  react: {
    useSuspense: false,
  },
});

// Load minimal translations immediately for login page
// Full translations loaded on-demand when user navigates to other pages
void loadMinimalLoginTranslations().then((minimalTranslations) => {
  i18n.addResourceBundle("en", "translation", minimalTranslations, true, true);
  resources.en = { translation: minimalTranslations };

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

// Export function to load full translations when needed (e.g., after login)
export const loadFullTranslations = async (): Promise<void> => {
  if (resources.en && Object.keys(resources.en.translation).length > 50) {
    return; // Already loaded full translations
  }

  const fullTranslations = await loadFullEnglishTranslations();
  i18n.addResourceBundle("en", "translation", fullTranslations, true, true);
  resources.en = { translation: fullTranslations };
};

// Export function to load languages on-demand
export const loadLanguageTranslations = loadLanguage;

export const ensurePrivateTranslationsLoaded = async () => {
  // Load full translations when user accesses protected routes (after login)
  await loadFullTranslations();
};

if (typeof window !== "undefined") {
  i18n.on("languageChanged", (lng) => {
    window.localStorage.setItem("fitvibe:language", lng);
  });
}

export default i18n;
