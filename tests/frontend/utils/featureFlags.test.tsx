import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";

const { mockApiClient } = vi.hoisted(() => ({
  mockApiClient: {
    get: vi.fn(),
  },
}));
import {
  fetchSystemConfig,
  getSystemConfig,
  isFeatureEnabled,
  useSystemConfig,
  useFeatureFlag,
  useReadOnlyMode,
  resetConfigCache,
  type SystemConfig,
} from "../../src/utils/featureFlags";

vi.mock("../../src/services/api", () => ({
  apiClient: mockApiClient,
}));

type ConfigOverrides = Omit<Partial<SystemConfig>, "features"> & {
  features?: Partial<SystemConfig["features"]>;
};

const createConfig = (overrides: ConfigOverrides = {}): SystemConfig => ({
  readOnlyMode: overrides.readOnlyMode ?? false,
  maintenanceMessage: overrides.maintenanceMessage,
  timestamp: overrides.timestamp ?? "2025-10-21T10:00:00.000Z",
  features: {
    socialFeed: false,
    coachDashboard: false,
    insights: false,
    ...(overrides.features ?? {}),
  },
});

describe("feature flag utilities", () => {
  beforeEach(() => {
    mockApiClient.get.mockReset();
    resetConfigCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetConfigCache();
  });

  it("fetchSystemConfig stores the latest feature configuration", async () => {
    const config = createConfig({
      features: { insights: true, socialFeed: true, coachDashboard: false },
    });
    mockApiClient.get.mockResolvedValueOnce({ data: config });

    const result = await fetchSystemConfig();

    expect(result).toEqual(config);
    expect(mockApiClient.get).toHaveBeenCalledWith("/api/v1/system/config");
    // Cache is updated synchronously in fetchSystemConfig
    expect(isFeatureEnabled("insights")).toBe(true);
    expect(isFeatureEnabled("coachDashboard")).toBe(false);
  });

  it("falls back to cached config when fetching fails", async () => {
    const cached = createConfig({ readOnlyMode: true });
    mockApiClient.get.mockResolvedValueOnce({ data: cached });
    await fetchSystemConfig();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApiClient.get.mockRejectedValueOnce(new Error("network down"));

    const fallback = await fetchSystemConfig();

    // Should return the cached config (same reference)
    expect(fallback).toBe(cached);
    expect(fallback.readOnlyMode).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "[WARN] [featureFlags] Failed to fetch config, using cached/default",
      expect.objectContaining({
        context: "featureFlags",
        error: expect.any(String),
      }),
    );
  });

  it("getSystemConfig reuses cache until TTL expires", async () => {
    const timeline: { now: number } = { now: 0 };
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => timeline.now);

    const initial = createConfig({
      features: { insights: true },
      readOnlyMode: false,
      maintenanceMessage: undefined,
    });
    mockApiClient.get.mockResolvedValueOnce({ data: initial });
    await getSystemConfig(true);

    mockApiClient.get.mockClear();
    timeline.now = 30_000;
    const cached = await getSystemConfig();
    expect(cached.features.insights).toBe(initial.features.insights);
    expect(mockApiClient.get).not.toHaveBeenCalled();

    const updated = createConfig({
      features: { insights: false, socialFeed: true },
      readOnlyMode: true,
      maintenanceMessage: "Upgrading",
    });
    timeline.now = 120_000;
    mockApiClient.get.mockResolvedValueOnce({ data: updated });

    const refreshed = await getSystemConfig();
    expect(refreshed.features.insights).toBe(updated.features.insights);
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);

    dateNowSpy.mockRestore();
  });

  it("useSystemConfig exposes loading state and refresh helper", async () => {
    const initial = createConfig({ readOnlyMode: false });
    const refreshed = createConfig({ readOnlyMode: true, maintenanceMessage: "Upgrading" });

    // Set up mock to handle multiple calls
    mockApiClient.get
      .mockResolvedValueOnce({ data: initial }) // First call on mount
      .mockResolvedValueOnce({ data: refreshed }); // Second call on refresh

    const stateRef: {
      current: ReturnType<typeof useSystemConfig> | null;
    } = { current: null };

    const ConfigConsumer = () => {
      const state = useSystemConfig(1_000);
      // Update ref on every render to get latest state
      stateRef.current = state;
      return (
        <div data-testid="container">
          <span data-testid="mode">{state.config.readOnlyMode ? "ro" : "rw"}</span>
          {state.isLoading && <span data-testid="loading">loading</span>}
          {state.error && <span data-testid="error">{state.error.message}</span>}
        </div>
      );
    };

    render(<ConfigConsumer />);

    // Component should render immediately with cached/default config
    await waitFor(
      () => {
        expect(screen.getByTestId("container")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Wait for initial load to complete (useSystemConfig calls refresh on mount)
    await waitFor(
      () => {
        const element = screen.getByTestId("mode");
        return element && element.textContent === "rw";
      },
      { timeout: 5000 },
    );

    expect(screen.queryByTestId("loading")).toBeNull();
    expect(stateRef.current?.config.readOnlyMode).toBe(false);

    // Trigger refresh - mock is already set up for second call
    await act(async () => {
      if (stateRef.current?.refresh) {
        await stateRef.current.refresh();
      }
    });

    // Wait for refresh to complete and state to update
    await waitFor(
      () => {
        const element = screen.getByTestId("mode");
        expect(element.textContent).toBe("ro");
      },
      { timeout: 5000 },
    );

    // Wait for loading to finish
    await waitFor(
      () => {
        expect(screen.queryByTestId("loading")).toBeNull();
      },
      { timeout: 1000 },
    );

    // Check the state ref after React has updated (ref is updated on every render)
    await waitFor(
      () => {
        expect(stateRef.current?.config.readOnlyMode).toBe(true);
      },
      { timeout: 1000 },
    );
  });

  it("useFeatureFlag and useReadOnlyMode reflect cached config values", async () => {
    const config = createConfig({
      readOnlyMode: true,
      maintenanceMessage: "Maintenance in progress",
      features: { insights: true },
    });

    // Pre-populate cache
    mockApiClient.get.mockResolvedValueOnce({ data: config });
    await getSystemConfig(true);

    // Set up mock for component's useSystemConfig hook (will be called on mount)
    mockApiClient.get.mockResolvedValue({ data: config });

    const Consumer = () => {
      const insightsEnabled = useFeatureFlag("insights");
      const { readOnlyMode, message } = useReadOnlyMode();
      return (
        <div>
          <span data-testid="flag">{insightsEnabled ? "enabled" : "disabled"}</span>
          <span data-testid="readonly">{readOnlyMode ? "active" : "inactive"}</span>
          <span data-testid="message">{message ?? "none"}</span>
        </div>
      );
    };

    render(<Consumer />);

    // Component should render immediately with cached/default values
    expect(screen.getByTestId("flag")).toBeInTheDocument();
    expect(screen.getByTestId("readonly")).toBeInTheDocument();
    expect(screen.getByTestId("message")).toBeInTheDocument();

    // Wait for hooks to fetch and update - useSystemConfig calls refresh on mount
    await waitFor(
      () => {
        const flagElement = screen.getByTestId("flag");
        return flagElement.textContent === "enabled";
      },
      { timeout: 5000 },
    );

    // Check values - they should reflect the config after fetch completes
    expect(screen.getByTestId("flag").textContent).toBe("enabled");
    expect(screen.getByTestId("readonly").textContent).toBe("active");
    expect(screen.getByTestId("message").textContent).toBe("Maintenance in progress");
  });
});
