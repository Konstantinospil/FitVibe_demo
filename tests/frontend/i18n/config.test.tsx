import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const CACHE_KEY_PREFIX = "fitvibe:translations:cache";

const setupConfig = async (options?: {
  storedLanguage?: string;
  navigatorLanguage?: string;
  requestIdleCallback?: boolean;
  fetchImpl?: typeof fetch;
  isInitialized?: boolean;
  cacheEntries?: Record<string, unknown>;
}) => {
  vi.resetModules();
  localStorage.clear();

  if (options?.storedLanguage) {
    localStorage.setItem("fitvibe:language", options.storedLanguage);
  }

  if (options?.cacheEntries) {
    Object.entries(options.cacheEntries).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  if (options?.navigatorLanguage) {
    Object.defineProperty(window.navigator, "language", {
      value: options.navigatorLanguage,
      configurable: true,
    });
  }

  if (options?.requestIdleCallback) {
    Object.defineProperty(window, "requestIdleCallback", {
      value: (cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 0 });
        return 0;
      },
      configurable: true,
      writable: true,
    });
  } else {
    const descriptor = Object.getOwnPropertyDescriptor(window, "requestIdleCallback");
    if (descriptor?.configurable) {
      delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
    } else {
      try {
        Object.defineProperty(window, "requestIdleCallback", {
          value: undefined,
          configurable: true,
          writable: true,
        });
      } catch {
        (window as { requestIdleCallback?: unknown }).requestIdleCallback = undefined;
      }
    }
  }

  const i18nMock = {
    use: vi.fn().mockReturnThis(),
    init: vi.fn(),
    addResourceBundle: vi.fn(),
    changeLanguage: vi.fn(),
    on: vi.fn(),
    isInitialized: options?.isInitialized ?? true,
    language: "en",
  };

  vi.doMock("i18next", () => ({
    default: i18nMock,
  }));

  vi.doMock("react-i18next", () => ({
    initReactI18next: {},
  }));

  const fetchMock =
    options?.fetchImpl ??
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ common: { hello: "hi" } }),
    }));

  vi.stubGlobal("fetch", fetchMock);

  const config = await import("../../src/i18n/config");

  return { config, i18nMock, fetchMock };
};

describe("i18n config", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses cached translations when available", async () => {
    const cached = {
      data: { common: { cached: true }, terms: {}, privacy: {}, cookie: {} },
      timestamp: Date.now(),
      language: "en",
    };
    const { config, i18nMock } = await setupConfig({
      cacheEntries: {
        [`${CACHE_KEY_PREFIX}:en`]: cached,
      },
    });

    await config.loadLanguageTranslations("en");

    expect(i18nMock.addResourceBundle).toHaveBeenCalledWith(
      "en",
      "translation",
      cached.data,
      true,
      true,
    );
  });

  it("falls back to JSON when API returns empty translations", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ terms: {}, privacy: {}, cookie: {} }),
    }));
    const { config, fetchMock: stubbedFetch } = await setupConfig({ fetchImpl: fetchMock });

    await config.loadLanguageTranslations("en");

    expect(stubbedFetch).toHaveBeenCalled();
    expect(localStorage.getItem(`${CACHE_KEY_PREFIX}:en`)).toBeNull();
  });

  it("caches API translations when response is non-empty", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1234);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ common: { api: true } }),
    }));

    const { config } = await setupConfig({ fetchImpl: fetchMock });

    await config.loadLanguageTranslations("en");

    const cachedRaw = localStorage.getItem(`${CACHE_KEY_PREFIX}:en`);
    expect(cachedRaw).not.toBeNull();
    const cached = JSON.parse(cachedRaw ?? "{}") as { timestamp: number; language: string };
    expect(cached.timestamp).toBe(1234);
    expect(cached.language).toBe("en");
    nowSpy.mockRestore();
  });

  it("ignores invalid cache entries", async () => {
    localStorage.setItem(`${CACHE_KEY_PREFIX}:en`, "not-json");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ common: { api: true } }),
    }));

    const { config, fetchMock: stubbedFetch } = await setupConfig({ fetchImpl: fetchMock });

    await config.loadLanguageTranslations("en");

    expect(stubbedFetch).toHaveBeenCalled();
  });

  it("uses stored language during idle loading", async () => {
    const { config, i18nMock } = await setupConfig({
      storedLanguage: "de",
      requestIdleCallback: true,
    });

    await config.translationsLoadingPromise;

    expect(i18nMock.changeLanguage).toHaveBeenCalledWith("de");
  });

  it("falls back to timeout-based loading without requestIdleCallback", async () => {
    const { config, i18nMock } = await setupConfig({
      storedLanguage: "fr",
      requestIdleCallback: false,
    });

    await config.translationsLoadingPromise;

    expect(i18nMock.changeLanguage).toHaveBeenCalledWith("fr");
  });

  it("loads full translations via helper export", async () => {
    const cached = {
      data: { common: { full: true }, terms: {}, privacy: {}, cookie: {} },
      timestamp: Date.now(),
      language: "en",
    };
    const { config, i18nMock } = await setupConfig({
      cacheEntries: {
        [`${CACHE_KEY_PREFIX}:en`]: cached,
      },
    });

    await config.loadFullTranslations();

    expect(i18nMock.addResourceBundle).toHaveBeenCalledWith(
      "en",
      "translation",
      cached.data,
      true,
      true,
    );
  });

  it("resolves private translations helper", async () => {
    const { config } = await setupConfig();

    await expect(config.ensurePrivateTranslationsLoaded()).resolves.toBeUndefined();
  });
});
