import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StatusPill from "../../src/components/StatusPill";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "status.checking": "Checking",
        "status.online": "Online",
        "status.offline": "Offline",
      };
      return translations[key] || options?.defaultValue || key;
    },
  }),
}));

describe("StatusPill", () => {
  it("should render checking status", () => {
    render(<StatusPill status="checking" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
  });

  it("should render online status", () => {
    render(<StatusPill status="online" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("should render offline status", () => {
    render(<StatusPill status="offline" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("should render with custom children string", () => {
    render(<StatusPill status="online">Custom Status</StatusPill>);
    expect(screen.getByText("Custom Status")).toBeInTheDocument();
  });

  it("should render with custom React node children", () => {
    render(
      <StatusPill status="online">
        <span data-testid="custom-node">Custom Node</span>
      </StatusPill>,
    );
    expect(screen.getByTestId("custom-node")).toBeInTheDocument();
  });

  it("should have aria-live attribute", () => {
    const { container } = render(<StatusPill status="online" />);
    const pill = container.querySelector("[role='status']");
    expect(pill).toHaveAttribute("aria-live", "polite");
  });

  it("should have aria-label when using translation", () => {
    render(<StatusPill status="online" />);
    const pill = screen.getByRole("status");
    expect(pill).toHaveAttribute("aria-label", "Online");
  });

  it("should have aria-label when using custom string children", () => {
    render(<StatusPill status="online">Custom Label</StatusPill>);
    const pill = screen.getByRole("status");
    expect(pill).toHaveAttribute("aria-label", "Custom Label");
  });

  it("should show pulse animation for checking status", () => {
    const { container } = render(<StatusPill status="checking" />);
    const pill = container.querySelector("[role='status']") as HTMLElement;
    expect(pill?.style.boxShadow).toContain("0 0 6px");
  });

  it("should not show pulse animation for non-checking status", () => {
    const { container } = render(<StatusPill status="online" />);
    const pill = container.querySelector("[role='status']");
    expect(pill).toHaveStyle({ boxShadow: "none" });
  });

  it("should handle empty string children by using translation", () => {
    render(<StatusPill status="online">{""}</StatusPill>);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("should handle whitespace-only children by using translation", () => {
    render(<StatusPill status="online"> </StatusPill>);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });
});
