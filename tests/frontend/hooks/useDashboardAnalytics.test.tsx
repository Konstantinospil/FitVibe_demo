import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardAnalytics } from "../../src/hooks/useDashboardAnalytics";
import * as api from "../../src/services/api";
import type {
  DashboardAnalyticsResponse,
  DashboardRange,
  DashboardGrain,
} from "../../src/services/api";

vi.mock("../../src/services/api", () => ({
  getDashboardAnalytics: vi.fn(),
}));

describe("useDashboardAnalytics", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0, // Disable garbage collection time for tests
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up QueryClient to prevent memory leaks
    queryClient.clear();
    queryClient.removeQueries();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should fetch dashboard analytics with range and grain", async () => {
    const mockData: DashboardAnalyticsResponse = {
      summary: [],
      personalRecords: [],
      aggregates: [],
      meta: {
        range: "4w",
        grain: "weekly",
        totalRows: 0,
        truncated: false,
      },
    };

    vi.mocked(api.getDashboardAnalytics).mockResolvedValue(mockData);

    const { result } = renderHook(
      () =>
        useDashboardAnalytics({
          range: "4w",
          grain: "weekly",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(api.getDashboardAnalytics).toHaveBeenCalledWith({
      range: "4w",
      grain: "weekly",
    });
  });

  it("should use placeholder data for smooth transitions", async () => {
    const mockData1: DashboardAnalyticsResponse = {
      summary: [],
      personalRecords: [],
      aggregates: [],
      meta: {
        range: "4w",
        grain: "weekly",
        totalRows: 0,
        truncated: false,
      },
    };
    const mockData2: DashboardAnalyticsResponse = {
      summary: [],
      personalRecords: [],
      aggregates: [],
      meta: {
        range: "8w",
        grain: "monthly",
        totalRows: 0,
        truncated: false,
      },
    };

    vi.mocked(api.getDashboardAnalytics).mockResolvedValueOnce(mockData1);

    const { result, rerender } = renderHook(
      ({ range, grain }: { range: DashboardRange; grain: DashboardGrain }) =>
        useDashboardAnalytics({
          range,
          grain,
        }),
      {
        wrapper,
        initialProps: {
          range: "4w" as DashboardRange,
          grain: "weekly" as DashboardGrain,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData1);

    // Change props
    vi.mocked(api.getDashboardAnalytics).mockResolvedValueOnce(mockData2);
    rerender({
      range: "8w" as DashboardRange,
      grain: "monthly" as DashboardGrain,
    });

    // Should show placeholder data during loading
    expect(result.current.data).toEqual(mockData1);

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });
  });

  it("should handle error state", async () => {
    vi.mocked(api.getDashboardAnalytics).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () =>
        useDashboardAnalytics({
          range: "4w",
          grain: "weekly",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
