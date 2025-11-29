import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import VisibilityBadge from "../../../src/components/ui/VisibilityBadge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "visibility.labels.private": "Private",
        "visibility.labels.link": "Link",
        "visibility.labels.public": "Public",
      };
      return translations[key] || key;
    },
  }),
}));

describe("VisibilityBadge", () => {
  it("should render private badge", () => {
    render(<VisibilityBadge level="private" />);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("should render link badge", () => {
    render(<VisibilityBadge level="link" />);
    expect(screen.getByText("Link")).toBeInTheDocument();
  });

  it("should render public badge", () => {
    render(<VisibilityBadge level="public" />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("should display indicator dot", () => {
    const { container } = render(<VisibilityBadge level="public" />);
    const indicator = container.querySelector("span[aria-hidden='true']");
    expect(indicator).toBeInTheDocument();
  });

  it("should apply custom style", () => {
    const customStyle = { margin: "10px" };
    const { container } = render(<VisibilityBadge level="public" style={customStyle} />);
    const badge = container.querySelector("span");
    expect(badge).toHaveStyle(customStyle);
  });

  it("should pass through other HTML attributes", () => {
    const { container } = render(
      <VisibilityBadge level="public" data-testid="badge" className="custom-badge" />,
    );
    const badge = container.querySelector("[data-testid='badge']");
    expect(badge).toHaveClass("custom-badge");
  });
});
