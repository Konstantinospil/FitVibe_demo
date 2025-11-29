import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Insights from "../../src/pages/Insights";
import * as api from "../../src/services/api";
import { useDashboardAnalytics } from "../../src/hooks/useDashboardAnalytics";

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

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable garbage collection time for tests
      },
    },
  });
};

describe("Insights page", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up QueryClient to prevent memory leaks
    queryClient.clear();
    queryClient.removeQueries();
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
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
  });

  it("should switch between dashboard and progress tabs", () => {
    vi.mocked(useDashboardAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardAnalytics>);

    renderInsights();

    const progressTab = screen.getByText("Progress");
    fireEvent.click(progressTab);

    expect(screen.getByText("Volume Trend")).toBeInTheDocument();
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

    expect(screen.getByText("Training streak")).toBeInTheDocument();
    expect(screen.getByText("24 days")).toBeInTheDocument();
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

    // Create a mock for URL.createObjectURL
    const createObjectURLSpy = vi.fn(() => "blob:test");
    global.URL.createObjectURL = createObjectURLSpy;

    const clickSpy = vi.fn();
    const removeSpy = vi.fn();

    // Save original createElement before mocking
    const originalCreateElement = document.createElement.bind(document);

    // Create a real anchor element using original method
    const anchorElement = originalCreateElement("a");
    anchorElement.click = clickSpy;
    anchorElement.remove = removeSpy;

    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return anchorElement;
      }
      // For other elements, use the original implementation
      return originalCreateElement(tagName);
    });

    renderInsights();

    const progressTab = screen.getByText("Progress");
    fireEvent.click(progressTab);

    await waitFor(() => {
      // Button text is "Export" based on translation mock
      expect(screen.getByText("Export")).toBeInTheDocument();
    });

    const exportButton = screen.getByText("Export");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(api.exportProgress).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
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

    const rangeSelect = screen.getByLabelText("Select range");
    fireEvent.change(rangeSelect, { target: { value: "8w" } });

    // The component should update state, which triggers useDashboardAnalytics with new params
    expect(rangeSelect).toHaveValue("8w");
  });
});
