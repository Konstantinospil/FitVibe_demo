import { describe, it, expect, beforeEach } from "vitest";
import i18n, {
  ensurePrivateTranslationsLoaded,
  loadFullTranslations,
  loadLanguageTranslations,
} from "../../src/i18n/config";

describe("i18n config", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads English JSON bundles into the translation namespace", async () => {
    await loadFullTranslations();

    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.t("navigation.back")).toBe("Back");
    expect(i18n.t("gamification.badges.title")).toBe("Badges");
    expect(i18n.t("feed.follow.follow")).toBe("Follow");
  });

  it("loads another language from locale JSON files", async () => {
    await loadLanguageTranslations("de");

    expect(i18n.hasResourceBundle("de", "translation")).toBe(true);
    expect(i18n.getResource("de", "translation", "navigation.back")).toBe("Zurück");
  });

  it("ensurePrivateTranslationsLoaded resolves", async () => {
    await expect(ensurePrivateTranslationsLoaded()).resolves.toBeUndefined();
  });
});
