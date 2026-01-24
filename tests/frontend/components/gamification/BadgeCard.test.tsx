import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgeCard } from "../../src/components/gamification/BadgeCard";

describe("BadgeCard", () => {
  it("renders badge icon and earned date when earned", () => {
    const earnedAt = "2024-01-10T12:00:00Z";
    render(
      <BadgeCard
        badge={{ code: "streak", name: "Streak", description: "7 days", icon: "🔥" }}
        earned
        earnedAt={earnedAt}
      />,
    );

    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText(new Date(earnedAt).toLocaleDateString())).toBeInTheDocument();
    expect(screen.queryByText("Not earned yet")).not.toBeInTheDocument();
  });

  it("renders fallback icon and not earned state", () => {
    render(<BadgeCard badge={{ code: "first", name: "First", description: "Start" }} />);

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Not earned yet")).toBeInTheDocument();
  });
});
