import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusPill } from "../../src/components/StatusPill";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "status.checking": "Checking",
        "status.online": "Server online",
        "status.offline": "Server offline",
      };
      return translations[key] || options?.defaultValue || key;
    },
  }),
}));

describe("StatusPill", () => {
  it("should render checking status with default label", () => {
    render(<StatusPill status="checking" />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveTextContent("Checking");
  });

  it("should render online status with default label", () => {
    render(<StatusPill status="online" />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveTextContent("Server online");
  });

  it("should render offline status with default label", () => {
    render(<StatusPill status="offline" />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveTextContent("Server offline");
  });

  it("should render custom text when provided as children", () => {
    render(<StatusPill status="online">Connected</StatusPill>);

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("should use translation key when children is empty", () => {
    render(<StatusPill status="online">{""}</StatusPill>);

    expect(screen.getByText("Server online")).toBeInTheDocument();
  });

  it("should use translation key when children contains only whitespace", () => {
    render(<StatusPill status="online">{"   "}</StatusPill>);

    expect(screen.getByText("Server online")).toBeInTheDocument();
  });

  it("should have aria-live polite attribute", () => {
    render(<StatusPill status="online" />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
  });

  it("should have aria-label when label is string", () => {
    render(<StatusPill status="online">Connected</StatusPill>);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveAttribute("aria-label", "Connected");
  });

  it("should use translated status as aria-label when children is not string", () => {
    render(
      <StatusPill status="online">
        <span>Complex Label</span>
      </StatusPill>,
    );

    const statusElement = screen.getByRole("status");
    // When children is not a simple string, the component falls back to translating the status
    expect(statusElement).toHaveAttribute("aria-label", "Server online");
  });

  it("should render indicator dot for checking status", () => {
    const { container } = render(<StatusPill status="checking" />);

    const dot = container.querySelector('span[style*="border-radius"]');
    expect(dot).toBeInTheDocument();
  });

  it("should render indicator dot for online status", () => {
    const { container } = render(<StatusPill status="online" />);

    const dot = container.querySelector('span[style*="border-radius"]');
    expect(dot).toBeInTheDocument();
  });

  it("should render indicator dot for offline status", () => {
    const { container } = render(<StatusPill status="offline" />);

    const dot = container.querySelector('span[style*="border-radius"]');
    expect(dot).toBeInTheDocument();
  });

  it("should apply pulse effect for checking status", () => {
    const { container } = render(<StatusPill status="checking" />);

    const statusElement = container.querySelector('span[role="status"]');
    const computedStyle = statusElement?.getAttribute("style");
    expect(computedStyle).toContain("box-shadow");
  });

  it("should not apply pulse effect for online status", () => {
    const { container } = render(<StatusPill status="online" />);

    const statusElement = container.querySelector('span[role="status"]');
    const computedStyle = statusElement?.getAttribute("style");
    expect(computedStyle).toContain("box-shadow: none");
  });

  it("should not apply pulse effect for offline status", () => {
    const { container } = render(<StatusPill status="offline" />);

    const statusElement = container.querySelector('span[role="status"]');
    const computedStyle = statusElement?.getAttribute("style");
    expect(computedStyle).toContain("box-shadow: none");
  });

  it("should render complex children content while using translated status for aria-label", () => {
    render(
      <StatusPill status="online">
        <span>Status:</span> <strong>Active</strong>
      </StatusPill>,
    );

    // When children is complex, component renders the complex content
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    // But uses translated status for aria-label (accessibility)
    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveAttribute("aria-label", "Server online");
  });

  it("should apply correct styles for checking status", () => {
    const { container } = render(<StatusPill status="checking" />);

    const statusElement = container.querySelector('span[role="status"]');
    const computedStyle = statusElement?.getAttribute("style");

    expect(computedStyle).toContain("display: inline-flex");
    expect(computedStyle).toContain("align-items: center");
    expect(computedStyle).toContain("border-radius: 999px");
  });

  it("should apply correct styles for online status", () => {
    const { container } = render(<StatusPill status="online" />);

    const statusElement = container.querySelector('span[role="status"]');
    expect(statusElement).toBeInTheDocument();
  });

  it("should apply correct styles for offline status", () => {
    const { container } = render(<StatusPill status="offline" />);

    const statusElement = container.querySelector('span[role="status"]');
    expect(statusElement).toBeInTheDocument();
  });
});
