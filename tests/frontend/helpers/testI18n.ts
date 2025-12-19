import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Shared i18n instance for all tests
// This avoids creating a new instance for every test file
let testI18nInstance: i18n | null = null;

/**
 * Get or create a shared i18n instance for testing
 * This instance is reused across all tests for better performance
 */
export function getTestI18n(): i18n {
  if (!testI18nInstance) {
    testI18nInstance = i18n.createInstance();
    void testI18nInstance.use(initReactI18next).init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: {
          translation: {
            // Minimal translations - tests can add more as needed
            // Common translations that many tests use
            "common.loading": "Loading...",
            "common.error": "Error",
            "common.success": "Success",
            "common.cancel": "Cancel",
            "common.confirm": "Confirm",
            "common.save": "Save",
            "common.delete": "Delete",
            "common.edit": "Edit",
            "common.close": "Close",
          },
        },
      },
      // Fast config for tests - no suspense, no interpolation escaping
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      // Disable debug mode for faster tests
      debug: false,
    });
  }
  return testI18nInstance;
}

/**
 * Reset the test i18n instance
 * Useful for tests that need a fresh instance
 */
export function resetTestI18n(): void {
  if (testI18nInstance) {
    testI18nInstance = null;
  }
}

/**
 * Add translations to the test i18n instance
 * Useful for tests that need specific translations
 */
export function addTestTranslations(
  namespace: string,
  translations: Record<string, string>,
): void {
  const instance = getTestI18n();
  instance.addResourceBundle("en", namespace, translations, true, true);
}

