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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchSystemConfig stores the latest feature configuration", async () => {
    const config = createConfig({
      features: { insights: true, socialFeed: true, coachDashboard: false },
    });
    mockApiClient.get.mockResolvedValueOnce({ data: config });

    const result = await fetchSystemConfig();

    expect(result).toEqual(config);
    expect(mockApiClient.get).toHaveBeenCalledWith("/api/v1/system/config");
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

    expect(fallback).toBe(cached);
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
    vi.spyOn(Date, "now").mockImplementation(() => timeline.now);

    const initial = createConfig({ features: { insights: true } });
    mockApiClient.get.mockResolvedValueOnce({ data: initial });
    await getSystemConfig(true);

    mockApiClient.get.mockClear();
    timeline.now = 30_000;
    const cached = await getSystemConfig();
    expect(cached).toEqual(initial);
    expect(mockApiClient.get).not.toHaveBeenCalled();

    const updated = createConfig({ features: { insights: false, socialFeed: true } });
    timeline.now = 120_000;
    mockApiClient.get.mockResolvedValueOnce({ data: updated });

    const refreshed = await getSystemConfig();
    expect(refreshed).toEqual(updated);
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
  });

  it("useSystemConfig exposes loading state and refresh helper", async () => {
    const initial = createConfig({ readOnlyMode: false });
    const refreshed = createConfig({ readOnlyMode: true, maintenanceMessage: "Upgrading" });
    mockApiClient.get.mockResolvedValueOnce({ data: initial });
    mockApiClient.get.mockResolvedValueOnce({ data: refreshed });

    const stateRef: {
      current: ReturnType<typeof useSystemConfig> | null;
    } = { current: null };

    const ConfigConsumer = () => {
      const state = useSystemConfig(1_000);
      stateRef.current = state;
      return (
        <div>
          <span data-testid="mode">{state.config.readOnlyMode ? "ro" : "rw"}</span>
          {state.isLoading && <span data-testid="loading">loading</span>}
          {state.error && <span data-testid="error">{state.error.message}</span>}
        </div>
      );
    };

    render(<ConfigConsumer />);
    await waitFor(() => expect(screen.getByTestId("mode").textContent).toBe("rw"));
    expect(screen.queryByTestId("loading")).toBeNull();

    await act(async () => {
      await stateRef.current?.refresh();
    });

    await waitFor(() => expect(screen.getByTestId("mode").textContent).toBe("ro"));
    expect(screen.queryByTestId("loading")).toBeNull();
    expect(stateRef.current?.config).toEqual(refreshed);
  });

  it("useFeatureFlag and useReadOnlyMode reflect cached config values", async () => {
    const config = createConfig({
      readOnlyMode: true,
      maintenanceMessage: "Maintenance in progress",
      features: { insights: true },
    });

    mockApiClient.get.mockResolvedValue({ data: config });
    await getSystemConfig(true);
    mockApiClient.get.mockClear();
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

    await waitFor(() => {
      expect(screen.getByTestId("flag").textContent).toBe("enabled");
      expect(screen.getByTestId("readonly").textContent).toBe("active");
      expect(screen.getByTestId("message").textContent).toBe("Maintenance in progress");
    });
  });
});
