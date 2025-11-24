import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../../src/utils/logger";

describe("logger", () => {
  const originalEnv = import.meta.env.DEV;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(import.meta, "env", {
      value: { ...import.meta.env, DEV: originalEnv },
      writable: true,
    });
  });

  describe("debug", () => {
    it("should log debug messages in development", () => {
      // Logger checks import.meta.env.DEV at construction time
      // In test environment, it's typically true, so we just verify it works
      logger.debug("Debug message", { key: "value" });

      // In test environment (DEV=true), debug should be called
      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] Debug message", { key: "value" });
    });

    it("should handle debug messages without context", () => {
      logger.debug("Debug message");

      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] Debug message", "");
    });

    it("should handle debug messages without context", () => {
      Object.defineProperty(import.meta, "env", {
        value: { ...import.meta.env, DEV: true },
        writable: true,
      });

      logger.debug("Debug message");

      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] Debug message", "");
    });
  });

  describe("info", () => {
    it("should log info messages in development", () => {
      // Logger checks import.meta.env.DEV at construction time
      // In test environment, it's typically true
      logger.info("Info message", { key: "value" });

      // In test environment (DEV=true), info should be called
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Info message", { key: "value" });
    });
  });

  describe("warn", () => {
    it("should log warnings in all environments", () => {
      logger.warn("Warning message", { key: "value" });

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] Warning message", { key: "value" });
    });

    it("should handle warnings without context", () => {
      logger.warn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] Warning message", "");
    });
  });

  describe("error", () => {
    it("should log errors with Error object", () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";

      logger.error("Error message", error, { context: "test" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error message",
        expect.objectContaining({
          context: "test",
          errorMessage: "Test error",
          errorStack: "Error stack trace",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log errors with non-Error object", () => {
      const errorObj = { code: "ERR_CODE", message: "Custom error" };

      logger.error("Error message", errorObj as Error, { context: "test" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error message",
        expect.objectContaining({
          context: "test",
          error: errorObj,
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log errors without error object", () => {
      logger.error("Error message", undefined, { context: "test" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error message",
        expect.objectContaining({
          context: "test",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log errors without context", () => {
      const error = new Error("Test error");

      logger.error("Error message", error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] Error message",
        expect.objectContaining({
          errorMessage: "Test error",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("apiError", () => {
    it("should log API errors with axios error details", () => {
      const axiosError = {
        response: {
          status: 404,
          data: { error: { code: "NOT_FOUND", message: "Resource not found" } },
        },
        config: {
          url: "/api/v1/test",
          method: "GET",
        },
      };

      logger.apiError("API call failed", axiosError, "/api/v1/test", "GET");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] API call failed",
        expect.objectContaining({
          endpoint: "/api/v1/test",
          method: "GET",
          status: 404,
          responseData: { error: { code: "NOT_FOUND", message: "Resource not found" } },
          url: "/api/v1/test",
          requestMethod: "GET",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log API errors without endpoint and method", () => {
      const error = new Error("Network error");

      logger.apiError("API call failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] API call failed",
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log API errors with partial axios error", () => {
      const axiosError = {
        response: {
          status: 500,
        },
      };

      logger.apiError("API call failed", axiosError, "/api/v1/test", "POST");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR] API call failed",
        expect.objectContaining({
          endpoint: "/api/v1/test",
          method: "POST",
          status: 500,
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
