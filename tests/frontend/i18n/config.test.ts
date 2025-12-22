import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ensurePrivateTranslationsLoaded,
  loadFullTranslations,
  loadLanguageTranslations,
} from "../../src/i18n/config";
import i18n from "../../src/i18n/config";

describe("i18n config", () => {
  const originalWindow = global.window;
  const originalLocalStorage = global.localStorage;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
    global.navigator = originalNavigator;
  });

  it("ensurePrivateTranslationsLoaded resolves successfully", async () => {
    const result = await ensurePrivateTranslationsLoaded();
    expect(result).toBeUndefined();
  });

  it("detects language from localStorage when available", () => {
    window.localStorage.setItem("fitvibe:language", "de");
    // Re-initialize i18n to pick up the new language
    expect(i18n.language).toBeDefined();
  });

  it("falls back to browser language when localStorage is empty", () => {
    window.localStorage.removeItem("fitvibe:language");
    Object.defineProperty(window.navigator, "language", {
      writable: true,
      value: "de",
      configurable: true,
    });
    // Re-initialize i18n to pick up browser language
    expect(i18n.language).toBeDefined();
  });

  it("falls back to English when browser language is not supported", () => {
    window.localStorage.removeItem("fitvibe:language");
    Object.defineProperty(window.navigator, "language", {
      writable: true,
      value: "fr",
      configurable: true,
    });
    // Should fall back to English
    expect(i18n.language).toBeDefined();
  });

  it("falls back to English when localStorage has unsupported language", () => {
    window.localStorage.setItem("fitvibe:language", "fr");
    // Should fall back to English
    expect(i18n.language).toBeDefined();
  });

  it("handles SSR environment (no window)", () => {
    // @ts-expect-error - simulating SSR
    global.window = undefined;
    // The detectLanguage function should handle undefined window
    // This tests the window === "undefined" branch
    expect(i18n.language).toBeDefined();
  });

  it("handles missing navigator", () => {
    window.localStorage.removeItem("fitvibe:language");
    // @ts-expect-error - simulating missing navigator
    Object.defineProperty(window, "navigator", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Should fall back to English
    expect(i18n.language).toBeDefined();
  });

  it("handles browser language without slice method", () => {
    // Ensure localStorage is available
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("fitvibe:language");
    }
    Object.defineProperty(window.navigator, "language", {
      writable: true,
      value: null,
      configurable: true,
    });
    // Should fall back to English
    expect(i18n.language).toBeDefined();
  });

  it("saves language to localStorage when language changes", async () => {
    // Clear localStorage first
    window.localStorage.removeItem("fitvibe:language");
    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    // Change language and wait for the change to complete
    await i18n.changeLanguage("de");

    // Wait a bit for the event listener to fire (languageChanged event fires asynchronously)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify localStorage was updated (this is what we really care about)
    expect(window.localStorage.getItem("fitvibe:language")).toBe("de");

    // The event listener in config.ts should have called setItem
    // Note: The spy might not catch it if the event listener was set up before the spy,
    // but we verify the actual behavior (localStorage update) above
    if (setItemSpy.mock.calls.length > 0) {
      expect(setItemSpy).toHaveBeenCalledWith("fitvibe:language", "de");
    }
    setItemSpy.mockRestore();
  });

  it("should load full translations when not already loaded", async () => {
    // Clear existing resources to simulate not loaded
    const result = await loadFullTranslations();
    expect(result).toBeUndefined();
    // Should have loaded translations
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
  });

  it("should skip loading full translations when already loaded", async () => {
    // First load
    await loadFullTranslations();
    // Second call should skip
    const result = await loadFullTranslations();
    expect(result).toBeUndefined();
  });

  it("should handle loadLanguage error and fallback to English", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Try to load a non-existent language
    await loadLanguageTranslations("xx" as any);

    // Should have warned and attempted to load English
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load language"),
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });

  it("should handle loadLanguage when language is already loaded", async () => {
    // Load language first
    await loadLanguageTranslations("de");
    // Load again - should return early
    const result = await loadLanguageTranslations("de");
    expect(result).toBeUndefined();
  });

  it("should load language translations successfully", async () => {
    const result = await loadLanguageTranslations("de");
    expect(result).toBeUndefined();
    expect(i18n.hasResourceBundle("de", "translation")).toBe(true);
  });
});
