import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    getPointsHistory: vi.fn(),
  };
});

import * as api from "../../src/services/api";
import { PointsHistory } from "../../src/components/gamification/PointsHistory";

describe("PointsHistory", () => {
  const mockGetPointsHistory = vi.mocked(api.getPointsHistory);

  beforeEach(() => {
    mockGetPointsHistory.mockReset();
  });

  it("shows empty state when no history is returned", async () => {
    mockGetPointsHistory.mockResolvedValueOnce({ items: [], nextCursor: null });

    render(<PointsHistory />);

    expect(await screen.findByText("No points history yet")).toBeInTheDocument();
  });

  it("renders history and loads more items", async () => {
    mockGetPointsHistory
      .mockResolvedValueOnce({
        items: [
          {
            id: "1",
            source_type: "workout_complete",
            points: 10,
            awarded_at: "2024-01-01T00:00:00Z",
          },
        ],
        nextCursor: "next",
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "2",
            source_type: "streak_bonus",
            points: 5,
            awarded_at: "2024-01-02T00:00:00Z",
          },
        ],
        nextCursor: null,
      });

    render(<PointsHistory limit={20} />);

    expect(await screen.findByText("workout complete")).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => {
      expect(screen.getByText("streak bonus")).toBeInTheDocument();
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    expect(mockGetPointsHistory).toHaveBeenCalledWith({ limit: 20 });
    expect(mockGetPointsHistory).toHaveBeenCalledWith({ cursor: "next", limit: 20 });
  });

  it("shows error state when history fails to load", async () => {
    mockGetPointsHistory.mockRejectedValueOnce(new Error("Boom"));

    render(<PointsHistory />);

    expect(await screen.findByText("Boom")).toBeInTheDocument();
  });

  it("shows error state when loading more fails", async () => {
    mockGetPointsHistory
      .mockResolvedValueOnce({
        items: [
          {
            id: "1",
            source_type: "workout_complete",
            points: 10,
            awarded_at: "2024-01-01T00:00:00Z",
          },
        ],
        nextCursor: "next",
      })
      .mockRejectedValueOnce(new Error("Load more failed"));

    render(<PointsHistory />);

    expect(await screen.findByText("workout complete")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Load more failed")).toBeInTheDocument();
  });
});
