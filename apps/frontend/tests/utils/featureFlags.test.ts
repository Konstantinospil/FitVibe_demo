import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchSystemConfig,
  getSystemConfig,
  isFeatureEnabled,
  useSystemConfig,
  useFeatureFlag,
  useReadOnlyMode,
  type SystemConfig,
  type FeatureFlags,
} from "../../src/utils/featureFlags";
import { apiClient } from "../../src/services/api";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("../../src/services/api");

describe("featureFlags", () => {
  const mockConfig: SystemConfig = {
    readOnlyMode: false,
    features: {
      socialFeed: true,
      coachDashboard: false,
      insights: true,
    },
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchSystemConfig", () => {
    it("should fetch system configuration from API", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const result = await fetchSystemConfig();

      expect(apiClient.get).toHaveBeenCalledWith("/api/v1/system/config");
      expect(result).toEqual(mockConfig);
    });

    it("should return cached config on error", async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // First call to set cache
      await fetchSystemConfig();

      // Second call should return cached value
      const result = await fetchSystemConfig();

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getSystemConfig", () => {
    it("should return cached config if cache is fresh", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      // Set cache
      await fetchSystemConfig();
      vi.clearAllMocks();

      // Should return cached value without API call
      const result = await getSystemConfig();

      expect(apiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it("should fetch fresh config if cache is stale", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      // Set cache
      await fetchSystemConfig();

      // Advance time past TTL (60 seconds)
      vi.advanceTimersByTime(61000);

      // Should fetch fresh config
      const result = await getSystemConfig();

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it("should force refresh when forceRefresh is true", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      // Set cache
      await fetchSystemConfig();
      vi.clearAllMocks();

      // Force refresh
      const result = await getSystemConfig(true);

      expect(apiClient.get).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });
  });

  describe("isFeatureEnabled", () => {
    it("should return true for enabled feature", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      await fetchSystemConfig();

      expect(isFeatureEnabled("socialFeed")).toBe(true);
      expect(isFeatureEnabled("insights")).toBe(true);
    });

    it("should return false for disabled feature", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      await fetchSystemConfig();

      expect(isFeatureEnabled("coachDashboard")).toBe(false);
    });

    it("should return false for unknown feature", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      await fetchSystemConfig();

      expect(isFeatureEnabled("unknownFeature" as keyof FeatureFlags)).toBe(false);
    });
  });

  describe("useSystemConfig", () => {
    it("should fetch config on mount", async () => {
      vi.useRealTimers();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const { result } = renderHook(() => useSystemConfig());

      expect(result.current.isLoading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.config).toEqual(mockConfig);
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch errors", async () => {
      vi.useRealTimers();
      const error = new Error("Network error");
      vi.mocked(apiClient.get).mockRejectedValue(error);

      const { result } = renderHook(() => useSystemConfig());

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.error).toBeDefined();
    });

    it("should poll for updates at specified interval", async () => {
      vi.useRealTimers();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const { result } = renderHook(() => useSystemConfig(1000));

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(apiClient.get).toHaveBeenCalledTimes(1);

      // Wait for poll interval
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await waitFor(
        () => {
          expect(apiClient.get).toHaveBeenCalledTimes(2);
        },
        { timeout: 5000 },
      );
    });

    it("should allow manual refresh", async () => {
      vi.useRealTimers();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const { result } = renderHook(() => useSystemConfig());

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      vi.clearAllMocks();

      await act(async () => {
        await result.current.refresh();
      });

      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("useFeatureFlag", () => {
    it("should return feature enabled state", async () => {
      vi.useRealTimers();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const { result } = renderHook(() => useFeatureFlag("socialFeed"));

      await waitFor(
        () => {
          expect(result.current).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it("should return false for disabled feature", async () => {
      vi.useRealTimers();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const { result } = renderHook(() => useFeatureFlag("coachDashboard"));

      await waitFor(
        () => {
          expect(result.current).toBe(false);
        },
        { timeout: 5000 },
      );
    });
  });

  describe("useReadOnlyMode", () => {
    it("should return read-only mode status", async () => {
      vi.useRealTimers();
      const readOnlyConfig: SystemConfig = {
        ...mockConfig,
        readOnlyMode: true,
        maintenanceMessage: "System maintenance",
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: readOnlyConfig,
      });

      const { result } = renderHook(() => useReadOnlyMode());

      await waitFor(
        () => {
          expect(result.current.readOnlyMode).toBe(true);
          expect(result.current.message).toBe("System maintenance");
        },
        { timeout: 5000 },
      );
    });

    it("should return false when not in read-only mode", async () => {
      vi.useRealTimers();
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockConfig,
      });

      const { result } = renderHook(() => useReadOnlyMode());

      await waitFor(
        () => {
          expect(result.current.readOnlyMode).toBe(false);
        },
        { timeout: 5000 },
      );
    });
  });
});
