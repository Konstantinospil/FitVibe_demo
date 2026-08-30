import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    getLeaderboard: vi.fn(),
  };
});

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => string) =>
    selector({ user: { id: "user-1" } }),
}));

import * as api from "../../src/services/api";
import { Leaderboard } from "../../src/components/gamification/Leaderboard";

describe("Leaderboard", () => {
  const mockGetLeaderboard = vi.mocked(api.getLeaderboard);

  beforeEach(() => {
    mockGetLeaderboard.mockReset();
  });

  it("shows loading state while fetching", () => {
    mockGetLeaderboard.mockImplementation(() => new Promise(() => {}));

    render(<Leaderboard />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    mockGetLeaderboard.mockRejectedValueOnce(new Error("Boom"));

    render(<Leaderboard />);

    expect(await screen.findByText("Boom")).toBeInTheDocument();
  });

  it("renders empty state when no entries exist", async () => {
    mockGetLeaderboard.mockResolvedValueOnce({ entries: [], total: 0 });

    render(<Leaderboard />);

    expect(await screen.findByText("No leaderboard entries yet")).toBeInTheDocument();
  });

  it("renders entries, current user badge, and showing count", async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      entries: [
        {
          userId: "user-1",
          username: "coach",
          displayName: "Coach",
          points: 1000,
          rank: 1,
        },
        {
          userId: "user-3",
          username: "spotter2",
          displayName: "Spotter Two",
          points: 800,
          rank: 2,
        },
        {
          userId: "user-4",
          username: "spotter3",
          displayName: "Spotter Three",
          points: 700,
          rank: 3,
        },
        {
          userId: "user-2",
          username: "spotter",
          displayName: null,
          points: 500,
          rank: 4,
        },
      ],
      total: 5,
    });

    render(<Leaderboard limit={2} />);

    await waitFor(() => {
      expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    });

    expect(screen.getByText("Coach")).toBeInTheDocument();
    expect(screen.getByText("(You)")).toBeInTheDocument();
    expect(screen.getByText("spotter")).toBeInTheDocument();
    expect(screen.getByText("#4")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("Showing {{count}} of {{total}}")).toBeInTheDocument();
  });
});
