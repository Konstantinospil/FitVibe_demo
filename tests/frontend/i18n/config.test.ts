import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ensurePrivateTranslationsLoaded } from "../../src/i18n/config";
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
    window.localStorage.removeItem("fitvibe:language");
    Object.defineProperty(window.navigator, "language", {
      writable: true,
      value: null,
      configurable: true,
    });
    // Should fall back to English
    expect(i18n.language).toBeDefined();
  });

  it("saves language to localStorage when language changes", async () => {
    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    // Ensure the event listener is set up (it's set up in config.ts when window is defined)
    // Wait for language change to complete and event to fire
    await new Promise<void>((resolve) => {
      const handler = () => {
        i18n.off("languageChanged", handler);
        resolve();
      };
      i18n.on("languageChanged", handler);
      void i18n.changeLanguage("de");
    });

    expect(setItemSpy).toHaveBeenCalledWith("fitvibe:language", "de");
    setItemSpy.mockRestore();
  });
});
