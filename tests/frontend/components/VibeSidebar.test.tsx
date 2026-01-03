import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import VibeSidebar from "../../../apps/frontend/src/components/layout/VibeSidebar";
import type * as ApiModule from "../../../apps/frontend/src/services/api";
import type { VibePointsResponse } from "../../../apps/frontend/src/services/api";

const mockAuthState = vi.hoisted(() => ({
  user: { username: "Alex" } as { username?: string; displayName?: string } | null,
}));

vi.mock("../../../apps/frontend/src/services/api", async () => {
  const actual = await vi.importActual<ApiModule>("../../../apps/frontend/src/services/api");
  return {
    ...actual,
    getVibePoints: vi.fn(),
  };
});

vi.mock("../../../apps/frontend/src/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "vibes.strength.name": "Strength",
        "vibes.agility.name": "Agility",
        "vibes.endurance.name": "Endurance",
        "vibes.explosivity.name": "Explosivity",
        "vibes.intelligence.name": "Intelligence",
        "vibes.regeneration.name": "Regeneration",
        "navigation.you": "You",
      })[key] || key,
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
  beforeEach(() => {
    mockAuthState.user = { username: "Alex" };
  });

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

  it("renders fallback labels when vibe points are missing", async () => {
    const { getVibePoints } = await import("../../../apps/frontend/src/services/api");
    vi.mocked(getVibePoints).mockResolvedValue(undefined);

    renderSidebar();

    expect(await screen.findByText("M1")).toBeInTheDocument();
    expect(screen.getByText("M12")).toBeInTheDocument();
  });

  it("switches the active metric when a vibe is selected", async () => {
    const { getVibePoints } = await import("../../../apps/frontend/src/services/api");
    vi.mocked(getVibePoints).mockResolvedValue(mockVibePoints);

    renderSidebar();

    const strengthLabel = await screen.findByText("Strength");
    const strengthButton = strengthLabel.closest("button");
    expect(strengthButton).not.toBeNull();
    if (strengthButton) {
      fireEvent.click(strengthButton);
    }

    expect(screen.getAllByText("12 pts")[0]).toBeInTheDocument();
  });

  it("collapses when unpinned and expands on hover", async () => {
    const { getVibePoints } = await import("../../../apps/frontend/src/services/api");
    vi.mocked(getVibePoints).mockResolvedValue(mockVibePoints);

    renderSidebar();

    const pinButton = await screen.findByRole("button", { name: "Unpin sidebar" });
    fireEvent.click(pinButton);

    expect(screen.queryByText("Overall Fitness")).not.toBeInTheDocument();

    const aside = screen.getByLabelText("Vibe performance sidebar");
    fireEvent.mouseEnter(aside);

    expect(await screen.findByText("Overall Fitness")).toBeInTheDocument();
  });

  it("falls back to 'You' when user details are missing", async () => {
    mockAuthState.user = null;
    const { getVibePoints } = await import("../../../apps/frontend/src/services/api");
    vi.mocked(getVibePoints).mockResolvedValue(mockVibePoints);

    renderSidebar();

    expect(await screen.findByText("You")).toBeInTheDocument();
  });
});
