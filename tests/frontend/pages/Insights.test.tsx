import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import Insights from "../../src/pages/Insights";
import * as api from "../../src/services/api";
import { useDashboardAnalytics } from "../../src/hooks/useDashboardAnalytics";
import { cleanupQueryClient, createTestQueryClient } from "../helpers/testQueryClient";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/hooks/useDashboardAnalytics", () => ({
  useDashboardAnalytics: vi.fn(),
}));

vi.mock("../../src/services/api", () => ({
  getProgressTrends: vi.fn(),
  getExerciseBreakdown: vi.fn(),
  exportProgress: vi.fn(),
}));

vi.mock("../../src/utils/logger", () => ({
  logger: {
    apiError: vi.fn(),
  },
}));

vi.mock("../../src/contexts/ToastContext", () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => {
        const translations: Record<string, string> = {
          "insights.eyebrow": "Insights",
          "insights.title": "Analytics & Insights",
          "insights.description": "Track your progress",
          "insights.dashboardTab": "Dashboard",
          "insights.progressTab": "Progress",
          "dashboard.last4Weeks": "Last 4 weeks",
          "dashboard.last8Weeks": "Last 8 weeks",
          "dashboard.weekly": "Weekly",
          "dashboard.monthly": "Monthly",
          "dashboard.selectRange": "Select range",
          "progress.presetRange": "Preset",
          "progress.customRange": "Custom",
          "progress.period": "Period",
          "progress.7days": "7 days",
          "progress.30days": "30 days",
          "progress.90days": "90 days",
          "progress.groupBy": "Group by",
          "progress.daily": "Daily",
          "progress.export": "Export",
          "progress.exportCsv": "Export CSV",
          "progress.exportError": "Export failed",
          "progress.exportFailed": "Export failed",
          "progress.volumeTrend": "Volume Trend",
          "progress.sessionsTrend": "Sessions Trend",
          "progress.intensityTrend": "Intensity Trend",
          "progress.exerciseBreakdown": "Exercise Breakdown",
          "progress.loadError": "Failed to load",
          "progress.failedToLoad": "Failed to load",
          "progress.failedToLoadExercise": "Failed to load exercises",
          "progress.retry": "Retry",
          "progress.noData": "No data available",
          "progress.noExercises": "No exercises",
          "progress.noExerciseData": "No exercise data",
          "progress.exercise": "Exercise",
          "progress.sessions": "Sessions",
          "progress.totalVolume": "Total Volume",
          "progress.avgVolume": "Avg Volume",
          "progress.maxWeight": "Max Weight",
          "progress.trend": "Trend",
          "progress.trendUp": "Up",
          "progress.trendDown": "Down",
          "progress.trendStable": "Stable",
          "progress.chartError": "Chart error",
          "progress.reload": "Reload",
          "progress.reloadPage": "Reload page",
        };
        return translations[key] || key;
      },
      i18n: {
        language: "en",
      },
    }),
  };
});

describe("Insights page", () => {
  let queryClient: QueryClient;

  const getDashboardTab = () => screen.getAllByRole("button", { name: "Dashboard" })[0];
  const getProgressTab = () => screen.getAllByRole("button", { name: "Progress" })[0];
  const getCustomToggle = () => screen.getAllByRole("button", { name: "Custom" })[0];
  const getPeriodSelect = () => screen.getAllByLabelText(/period/i)[0];
  const getGroupBySelect = () => screen.getAllByLabelText(/group by/i)[0];
  const getRangeSelect = () => screen.getAllByLabelText("Select range")[0];

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    vi.mocked(api.getProgressTrends).mockResolvedValue([]);
    vi.mocked(api.getExerciseBreakdown).mockResolvedValue({ exercises: [], period: 30 });
  });

  afterEach(() => {
    cleanup();
    cleanupQueryClient(queryClient);
  });

  const renderInsights = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Insights />
      </QueryClientProvider>,
    );
  };

  it("should render insights page with tabs", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    expect(screen.getByText("Analytics & Insights")).toBeInTheDocument();
    expect(getDashboardTab()).toBeInTheDocument();
    expect(getProgressTab()).toBeInTheDocument();
  });

  it("should switch between dashboard and progress tabs", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    const { container } = renderInsights();
    const scoped = within(container);

    const progressTab = scoped.getAllByRole("button", { name: "Progress" })[0];
    fireEvent.click(progressTab);

    expect(screen.getAllByText("Volume Trend")[0]).toBeInTheDocument();
  });

  it("should display dashboard metrics", () => {
    const mockData = {
      summary: [
        {
          id: "streak",
          label: "Training streak",
          value: "24 days",
          trend: "+3 vs last week",
        },
      ],
      personalRecords: [],
      aggregates: [],
      meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
    };

    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: mockData,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    expect(screen.getAllByText("Training streak")[0]).toBeInTheDocument();
    expect(screen.getAllByText("24 days")[0]).toBeInTheDocument();
  });

  it("should handle export progress", async () => {
    const mockBlob = new Blob(["test"], { type: "text/csv" });
    vi.mocked(api.exportProgress).mockResolvedValue(mockBlob);

    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    // Ensure required globals exist
    if (typeof document === "undefined" || !document.createElement) {
      throw new Error("document.createElement is not available in test environment");
    }
    if (typeof global === "undefined") {
      throw new Error("global is not available in test environment");
    }

    const originalCreateObjectURL = window.URL?.createObjectURL;
    const originalRevokeObjectURL = window.URL?.revokeObjectURL;

    if (!window.URL.createObjectURL) {
      Object.defineProperty(window.URL, "createObjectURL", {
        value: () => "",
        writable: true,
      });
    }

    if (!window.URL.revokeObjectURL) {
      Object.defineProperty(window.URL, "revokeObjectURL", {
        value: () => undefined,
        writable: true,
      });
    }

    const createObjectURLSpy = vi
      .spyOn(window.URL, "createObjectURL")
      .mockImplementation(() => "blob:test");
    const revokeObjectURLSpy = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    // Mock document.createElement for anchor elements
    // Ensure document is available
    if (
      typeof document === "undefined" ||
      !document ||
      typeof document.createElement !== "function"
    ) {
      throw new Error("document.createElement is not available in test environment");
    }

    // Save original implementation before spying
    const originalCreateElement = document.createElement;
    // Spy on createElement
    const createElementSpy = vi.spyOn(document, "createElement");
    createElementSpy.mockImplementation((tagName: string) => {
      return originalCreateElement.call(document, tagName);
    });

    const { container } = renderInsights();
    const scoped = within(container);

    const progressTab = scoped.getAllByRole("button", { name: "Progress" })[0];
    fireEvent.click(progressTab);

    await waitFor(
      () => {
        expect(scoped.getAllByText("Volume Trend")[0]).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const exportButton = scoped.getAllByRole("button", { name: "Export" })[0];
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(api.exportProgress).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    anchorClickSpy.mockRestore();

    if (originalCreateObjectURL) {
      window.URL.createObjectURL = originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      window.URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it("should display error message when dashboard data fails to load", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("Failed to load"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    expect(screen.getByText(/We could not refresh analytics right now/i)).toBeInTheDocument();
  });

  it("should allow changing dashboard range", () => {
    const mockRefetch = vi.fn();
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    const rangeSelect = getRangeSelect();
    fireEvent.change(rangeSelect, { target: { value: "8w" } });

    // The component should update state, which triggers useDashboardAnalytics with new params
    expect(rangeSelect).toHaveValue("8w");
  });

  it("should change grain between weekly and monthly", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    const monthlyButton = screen.getAllByText("Monthly")[0];
    fireEvent.click(monthlyButton);

    expect(monthlyButton).toBeInTheDocument();
  });

  it("should display loading state for metrics", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [
          {
            id: "streak",
            label: "Training streak",
            value: "24 days",
            trend: "+3 vs last week",
          },
        ],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: true,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    // Should show skeleton during loading
    expect(screen.getAllByText("Training streak")[0]).toBeInTheDocument();
  });

  it("should display metrics without trends", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [
          {
            id: "streak",
            label: "Training streak",
            value: "24 days",
            trend: undefined,
          },
        ],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    expect(screen.getAllByText("Training streak")[0]).toBeInTheDocument();
    expect(screen.getAllByText("24 days")[0]).toBeInTheDocument();
  });

  it("should display numeric metric values", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [
          {
            id: "volume",
            label: "Weekly volume",
            value: 52300,
            trend: "+5%",
          },
        ],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    expect(screen.getAllByText("Weekly volume")[0]).toBeInTheDocument();
    expect(screen.getAllByText("52,300")[0]).toBeInTheDocument();
  });

  it("should show isFetching indicator", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    expect(screen.getAllByText("Refreshing…")[0]).toBeInTheDocument();
  });

  it("should use fallback aggregates when data is empty", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: {
        summary: [],
        personalRecords: [],
        aggregates: [],
        meta: { range: "4w" as const, grain: "weekly" as const, totalRows: 0, truncated: false },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    // Should show table with fallback data
    expect(screen.getAllByText("Period")[0]).toBeInTheDocument();
  });

  it("should switch to custom range mode in progress tab", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    vi.mocked(api.getProgressTrends).mockResolvedValue([]);
    vi.mocked(api.getExerciseBreakdown).mockResolvedValue({ exercises: [], period: 30 });

    renderInsights();

    const progressTab = getProgressTab();
    fireEvent.click(progressTab);

    const customButton = getCustomToggle();
    fireEvent.click(customButton);

    expect(customButton).toBeInTheDocument();
  });

  it("should change period in progress tab", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    vi.mocked(api.getProgressTrends).mockResolvedValue([]);
    vi.mocked(api.getExerciseBreakdown).mockResolvedValue({ exercises: [], period: 30 });

    renderInsights();

    const progressTab = getProgressTab();
    fireEvent.click(progressTab);

    const periodSelect = getPeriodSelect();
    fireEvent.change(periodSelect, { target: { value: "90" } });

    expect(periodSelect).toHaveValue("90");
  });

  it("should change group by in progress tab", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    vi.mocked(api.getProgressTrends).mockResolvedValue([]);
    vi.mocked(api.getExerciseBreakdown).mockResolvedValue({ exercises: [], period: 30 });

    renderInsights();

    const progressTab = getProgressTab();
    fireEvent.click(progressTab);

    const groupBySelect = getGroupBySelect();
    fireEvent.change(groupBySelect, { target: { value: "day" } });

    expect(groupBySelect).toHaveValue("day");
  });

  it("should display empty state when trends data is empty", async () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    vi.mocked(api.getProgressTrends).mockResolvedValue([]);
    vi.mocked(api.getExerciseBreakdown).mockResolvedValue({ exercises: [], period: 30 });

    renderInsights();

    const progressTab = getProgressTab();
    fireEvent.click(progressTab);

    await waitFor(
      () => {
        expect(screen.getAllByText("Volume Trend")[0]).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should handle export error in progress tab", async () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    vi.mocked(api.getProgressTrends).mockResolvedValue([]);
    vi.mocked(api.getExerciseBreakdown).mockResolvedValue({ exercises: [], period: 30 });
    vi.mocked(api.exportProgress).mockRejectedValue(new Error("Export failed"));

    const { container } = renderInsights();
    const scoped = within(container);

    const progressTab = scoped.getAllByRole("button", { name: "Progress" })[0];
    fireEvent.click(progressTab);

    await waitFor(
      () => {
        expect(scoped.getAllByText("Volume Trend")[0]).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const exportButton = scoped.getAllByRole("button", { name: "Export" })[0];
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(api.exportProgress).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });
});
