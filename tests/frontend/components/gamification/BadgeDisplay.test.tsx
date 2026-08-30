import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadgeDisplay } from "../../src/components/gamification/BadgeDisplay";

const getUserBadges = vi.fn();
const getBadgeCatalog = vi.fn();

vi.mock("../../src/services/api", () => ({
  getUserBadges: (...args: unknown[]) => getUserBadges(...args),
  getBadgeCatalog: (...args: unknown[]) => getBadgeCatalog(...args),
}));

describe("BadgeDisplay", () => {
  beforeEach(() => {
    getUserBadges.mockReset();
    getBadgeCatalog.mockReset();
  });

  it("renders earned badges from the API", async () => {
    getUserBadges.mockResolvedValue({
      badges: [
        {
          id: "1",
          code: "first",
          name: "First",
          description: "Start",
          earnedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          code: "streak",
          name: "Streak",
          description: "7 days",
        },
      ],
      total: 2,
    });

    render(<BadgeDisplay />);

    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByText("Badges")).toBeInTheDocument();
  });

  it("shows empty state when the user has no badges", async () => {
    getUserBadges.mockResolvedValue({ badges: [], total: 0 });

    render(<BadgeDisplay showCatalog={false} />);

    await waitFor(() => expect(screen.getByText("No badges earned yet")).toBeInTheDocument());
  });
});
