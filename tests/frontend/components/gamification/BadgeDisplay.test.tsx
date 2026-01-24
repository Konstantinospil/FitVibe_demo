import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgeDisplay } from "../../src/components/gamification/BadgeDisplay";

describe("BadgeDisplay", () => {
  it("marks earned badges based on provided sets", () => {
    render(
      <BadgeDisplay
        badges={[
          { code: "first", name: "First", description: "Start" },
          { code: "streak", name: "Streak", description: "7 days" },
        ]}
        earnedBadgeCodes={new Set(["streak"])}
        earnedBadgeDates={new Map([["streak", "2024-01-01T00:00:00Z"]])}
      />,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByText("Not earned yet")).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2024-01-01T00:00:00Z").toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it("uses defaults when no earned data is provided", () => {
    render(
      <BadgeDisplay
        badges={[
          { code: "first", name: "First", description: "Start" },
          { code: "second", name: "Second", description: "Keep going" },
        ]}
      />,
    );

    expect(screen.getAllByText("Not earned yet")).toHaveLength(2);
  });
});
