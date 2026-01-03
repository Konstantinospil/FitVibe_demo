import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for suppressConsole.ts
 *
 * This module runs side effects on import. Since it's a side-effect module,
 * we test that:
 * 1. It doesn't break in SSR environments (no window)
 * 2. It correctly detects production vs development
 * 3. It suppresses console methods in production
 * 4. It restores console methods on beforeunload
 *
 * Note: The module runs immediately when imported, so we test the actual
 * behavior rather than trying to control when it runs.
 */

describe("suppressConsole", () => {
  const originalConsole = globalThis.console;
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let originalWindow: typeof window | undefined;
  let savedBeforeunloadHandler: (() => void) | undefined;

  beforeEach(() => {
    // Save original console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalWindow = global.window;
    savedBeforeunloadHandler = undefined;

    // Clear module cache to allow fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    // Restore original console methods
    globalThis.console = originalConsole;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;

    // Restore window
    if (originalWindow) {
      global.window = originalWindow;
    }

    // Clear module cache
    vi.resetModules();
  });

  describe("SSR safety", () => {
    it("should not throw error when window is undefined (SSR)", async () => {
      // Remove window to simulate SSR
      // @ts-expect-error - intentionally removing window for SSR test
      delete global.window;

      // Should not throw when imported
      await expect(import("../../src/utils/suppressConsole")).resolves.not.toThrow();

      // Console methods should still be callable
      expect(typeof console.error).toBe("function");
      expect(typeof console.warn).toBe("function");
    });
  });

  describe("production mode detection", () => {
    it("should detect production mode from import.meta.env.PROD", async () => {
      const module = await import("../../src/utils/suppressConsole");
      expect(module.shouldSuppress({ PROD: true })).toBe(true);
      expect(module.shouldSuppress({ PROD: false })).toBe(false);
    });

    it("should handle errors when accessing environment variables", async () => {
      const module = await import("../../src/utils/suppressConsole");
      const throwingEnv = new Proxy(
        {},
        {
          get: () => {
            throw new Error("env failure");
          },
        },
      );

      expect(module.shouldSuppress(throwingEnv as { PROD?: boolean })).toBe(false);
    });
  });

  describe("production suppression", () => {
    it("suppresses console methods and restores them on beforeunload", async () => {
      const errorSpy = vi.fn();
      const warnSpy = vi.fn();

      globalThis.console = { error: errorSpy, warn: warnSpy } as unknown as Console;

      const addEventListenerSpy = vi.fn((event: string, handler: () => void) => {
        if (event === "beforeunload") {
          savedBeforeunloadHandler = handler;
        }
      });

      global.window = {
        addEventListener: addEventListenerSpy,
        URL: {
          createObjectURL: vi.fn(),
          revokeObjectURL: vi.fn(),
        },
      } as unknown as Window & typeof globalThis;

      const module = await import("../../src/utils/suppressConsole");
      module.initializeSuppressConsole({ windowRef: global.window, isProd: true });

      globalThis.console.error("suppressed");
      globalThis.console.warn("suppressed");
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();

      savedBeforeunloadHandler?.();

      globalThis.console.error("restored");
      globalThis.console.warn("restored");
      expect(errorSpy).toHaveBeenCalledWith("restored");
      expect(warnSpy).toHaveBeenCalledWith("restored");
    });

    it("handles missing console methods gracefully", async () => {
      globalThis.console = { error: "nope", warn: null } as unknown as Console;
      global.window = {
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === "beforeunload") {
            savedBeforeunloadHandler = handler;
          }
        }),
      } as unknown as Window & typeof globalThis;

      const module = await import("../../src/utils/suppressConsole");
      module.initializeSuppressConsole({ windowRef: global.window, isProd: true });

      expect(globalThis.console.error).toBe("nope");
      expect(globalThis.console.warn).toBeNull();

      savedBeforeunloadHandler?.();

      expect(globalThis.console.error).toBe("nope");
      expect(globalThis.console.warn).toBeNull();
    });

    it("does nothing when console is unavailable", async () => {
      // @ts-expect-error - testing missing console
      globalThis.console = undefined;
      global.window = {
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === "beforeunload") {
            savedBeforeunloadHandler = handler;
          }
        }),
      } as unknown as Window & typeof globalThis;

      const module = await import("../../src/utils/suppressConsole");
      module.initializeSuppressConsole({ windowRef: global.window, isProd: true });
      expect(globalThis.console).toBeUndefined();
    });
  });

  describe("console method behavior", () => {
    it("should preserve console.error functionality in development", async () => {
      if (!global.window) {
        global.window = {
          addEventListener: vi.fn(),
          URL: {
            createObjectURL: vi.fn(),
            revokeObjectURL: vi.fn(),
          },
        } as unknown as Window & typeof globalThis;
      }

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await import("../../src/utils/suppressConsole");

      // In development/test mode, console.error should still work
      console.error("test message", { key: "value" });

      // Verify it's callable (in dev mode, it should still log)
      expect(typeof console.error).toBe("function");

      errorSpy.mockRestore();
    });

    it("should preserve console.warn functionality in development", async () => {
      if (!global.window) {
        global.window = {
          addEventListener: vi.fn(),
          URL: {
            createObjectURL: vi.fn(),
            revokeObjectURL: vi.fn(),
          },
        } as unknown as Window & typeof globalThis;
      }

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await import("../../src/utils/suppressConsole");

      // In development/test mode, console.warn should still work
      console.warn("test warning", { key: "value" });

      // Verify it's callable (in dev mode, it should still log)
      expect(typeof console.warn).toBe("function");

      warnSpy.mockRestore();
    });
  });

  describe("beforeunload handler", () => {
    it("should register beforeunload handler when in production", async () => {
      const addEventListenerSpy = vi.fn((event: string, handler: () => void) => {
        if (event === "beforeunload") {
          savedBeforeunloadHandler = handler;
        }
      });

      global.window = {
        addEventListener: addEventListenerSpy,
        URL: {
          createObjectURL: vi.fn(),
          revokeObjectURL: vi.fn(),
        },
      } as unknown as Window & typeof globalThis;

      const module = await import("../../src/utils/suppressConsole");
      module.initializeSuppressConsole({ windowRef: global.window, isProd: true });

      expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });
  });

  describe("module structure", () => {
    it("should expose suppression helpers for testing", async () => {
      const module = await import("../../src/utils/suppressConsole");

      expect(typeof module.initializeSuppressConsole).toBe("function");
      expect(typeof module.suppressConsole).toBe("function");
      expect(typeof module.restoreConsole).toBe("function");
      expect(typeof module.shouldSuppress).toBe("function");
    });

    it("should not throw when imported multiple times", async () => {
      // Clear cache
      vi.resetModules();

      // Import multiple times - should not throw
      await expect(import("../../src/utils/suppressConsole")).resolves.not.toThrow();
      await expect(import("../../src/utils/suppressConsole")).resolves.not.toThrow();
      await expect(import("../../src/utils/suppressConsole")).resolves.not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should treat env access failures as non-production", async () => {
      const module = await import("../../src/utils/suppressConsole");
      const throwingEnv = new Proxy(
        {},
        {
          get: () => {
            throw new Error("env failure");
          },
        },
      );

      expect(module.shouldSuppress(throwingEnv as { PROD?: boolean })).toBe(false);
    });

    it("should handle missing window.URL gracefully", async () => {
      global.window = {
        addEventListener: vi.fn(),
        // URL is missing
      } as unknown as Window & typeof globalThis;

      // Should not throw
      await expect(import("../../src/utils/suppressConsole")).resolves.not.toThrow();
    });

    it("should handle console methods being undefined", async () => {
      if (!global.window) {
        global.window = {
          addEventListener: vi.fn(),
          URL: {
            createObjectURL: vi.fn(),
            revokeObjectURL: vi.fn(),
          },
        } as unknown as Window & typeof globalThis;
      }

      // Save originals
      const originalError = console.error;
      const originalWarn = console.warn;

      // Temporarily remove console methods
      // @ts-expect-error - testing edge case
      delete console.error;
      // @ts-expect-error - testing edge case
      delete console.warn;

      // Should not throw (module handles this)
      await expect(import("../../src/utils/suppressConsole")).resolves.not.toThrow();

      // Restore
      console.error = originalError;
      console.warn = originalWarn;
    });
  });
});
