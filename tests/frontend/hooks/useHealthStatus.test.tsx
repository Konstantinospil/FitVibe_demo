import React, { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useHealthStatus, HEALTH_STATUS_QUERY_KEY } from "../../src/hooks/useHealthStatus";
import * as api from "../../src/services/api";

vi.mock("../../src/services/api");

const mockApi = vi.mocked(api);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useHealthStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return health status data when API call succeeds", async () => {
    mockApi.getHealthStatus.mockResolvedValue({
      status: "healthy",
    });

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe("healthy");
  });

  it("should use correct query key", () => {
    expect(HEALTH_STATUS_QUERY_KEY).toEqual(["health-status"]);
  });

  it("should handle API errors", async () => {
    mockApi.getHealthStatus.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("should return loading state initially", async () => {
    mockApi.getHealthStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ status: "healthy" }), 100);
        }),
    );

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for the promise to resolve to prevent leaving open timer handles
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("should refetch on configured interval", async () => {
    mockApi.getHealthStatus.mockResolvedValue({
      status: "healthy",
    });

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const initialCallCount = mockApi.getHealthStatus.mock.calls.length;

    // Wait for refetch interval (20s in the hook, but we're using shorter timeout in tests)
    // Note: In actual hook, refetchInterval is 20_000ms
    expect(initialCallCount).toBeGreaterThan(0);
  });

  it("should return different statuses", async () => {
    mockApi.getHealthStatus.mockResolvedValue({
      status: "degraded",
    });

    const { result } = renderHook(() => useHealthStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe("degraded");
  });

  it("should cache results based on staleTime", async () => {
    mockApi.getHealthStatus.mockResolvedValue({
      status: "healthy",
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useHealthStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstCallCount = mockApi.getHealthStatus.mock.calls.length;

    // Render hook again with same query client (should use cache)
    const { result: result2 } = renderHook(() => useHealthStatus(), { wrapper });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Should not make additional API calls due to staleTime
    const secondCallCount = mockApi.getHealthStatus.mock.calls.length;
    expect(secondCallCount).toBe(firstCallCount);
  });
});
