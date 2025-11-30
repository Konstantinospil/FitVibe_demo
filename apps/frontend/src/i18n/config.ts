import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enAuth from "./locales/en/auth.json";
import deAuth from "./locales/de/auth.json";
import frAuth from "./locales/fr/auth.json";
import esAuth from "./locales/es/auth.json";
import elAuth from "./locales/el/auth.json";
import enCommon from "./locales/en/common.json";
import deCommon from "./locales/de/common.json";
import frCommon from "./locales/fr/common.json";
import esCommon from "./locales/es/common.json";
import elCommon from "./locales/el/common.json";
import enTerms from "./locales/en/terms.json";
import deTerms from "./locales/de/terms.json";
import frTerms from "./locales/fr/terms.json";
import esTerms from "./locales/es/terms.json";
import elTerms from "./locales/el/terms.json";
import enPrivacy from "./locales/en/privacy.json";
import dePrivacy from "./locales/de/privacy.json";
import frPrivacy from "./locales/fr/privacy.json";
import esPrivacy from "./locales/es/privacy.json";
import elPrivacy from "./locales/el/privacy.json";

type SupportedLanguage = "en" | "de" | "fr" | "es" | "el";

const mergeTranslations = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  extra: U,
) => ({ ...base, ...extra });

const resources: Record<SupportedLanguage, { translation: Record<string, unknown> }> = {
  en: {
    translation: mergeTranslations(
      mergeTranslations(mergeTranslations(enCommon, enAuth), enTerms),
      enPrivacy,
    ) as Record<string, unknown>,
  },
  de: {
    translation: mergeTranslations(
      mergeTranslations(mergeTranslations(deCommon, deAuth), deTerms),
      dePrivacy,
    ) as Record<string, unknown>,
  },
  fr: {
    translation: mergeTranslations(
      mergeTranslations(mergeTranslations(frCommon, frAuth), frTerms),
      frPrivacy,
    ) as Record<string, unknown>,
  },
  es: {
    translation: mergeTranslations(
      mergeTranslations(mergeTranslations(esCommon, esAuth), esTerms),
      esPrivacy,
    ) as Record<string, unknown>,
  },
  el: {
    translation: mergeTranslations(
      mergeTranslations(mergeTranslations(elCommon, elAuth), elTerms),
      elPrivacy,
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

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

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
