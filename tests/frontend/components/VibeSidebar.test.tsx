import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import VibeSidebar from "../../../apps/frontend/src/components/layout/VibeSidebar";
import type * as ApiModule from "../../../apps/frontend/src/services/api";
import type { VibePointsResponse } from "../../../apps/frontend/src/services/api";

vi.mock("../../../apps/frontend/src/services/api", async () => {
  const actual = await vi.importActual<ApiModule>("../../../apps/frontend/src/services/api");
  return {
    ...actual,
    getVibePoints: vi.fn(),
  };
});

vi.mock("../../../apps/frontend/src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "Alex" },
  }),
}));

const mockVibePoints: VibePointsResponse = {
  period_months: 3,
  months: ["2025-01", "2025-02", "2025-03"],
  overall: {
    points: 30,
    trend: [
      { month: "2025-01", points: 5 },
      { month: "2025-02", points: 10 },
      { month: "2025-03", points: 15 },
    ],
  },
  vibes: [
    {
      type_code: "strength",
      points: 12,
      trend: [
        { month: "2025-01", points: 3 },
        { month: "2025-02", points: 4 },
        { month: "2025-03", points: 5 },
      ],
    },
  ],
};

const renderSidebar = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <VibeSidebar />
    </QueryClientProvider>,
  );
};

describe("VibeSidebar", () => {
  it("renders overall points and month labels from the API", async () => {
    const { getVibePoints } = await import("../../../apps/frontend/src/services/api");
    vi.mocked(getVibePoints).mockResolvedValue(mockVibePoints);

    renderSidebar();

    const overallLabel = await screen.findByText("Overall Fitness");
    expect(overallLabel).toBeInTheDocument();
    const overallButton = overallLabel.closest("button");
    expect(overallButton).not.toBeNull();
    if (overallButton) {
      expect(await within(overallButton).findByText("30")).toBeInTheDocument();
    }
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
  });
});
