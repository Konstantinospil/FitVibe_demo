import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MaintenanceBanner } from "../../src/components/MaintenanceBanner";
import { useReadOnlyMode } from "../../src/utils/featureFlags";

vi.mock("../../src/utils/featureFlags");
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "components.maintenanceBanner.message") {
        return "System is in maintenance mode";
      }
      return key;
    },
  }),
}));

describe("MaintenanceBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when read-only mode is disabled", () => {
    vi.mocked(useReadOnlyMode).mockReturnValue({
      readOnlyMode: false,
      message: undefined,
    });

    const { container } = render(<MaintenanceBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("should render banner when read-only mode is enabled", () => {
    vi.mocked(useReadOnlyMode).mockReturnValue({
      readOnlyMode: true,
      message: "System maintenance in progress",
    });

    render(<MaintenanceBanner />);
    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "assertive");
  });

  it("should display custom maintenance message", () => {
    vi.mocked(useReadOnlyMode).mockReturnValue({
      readOnlyMode: true,
      message: "Custom maintenance message",
    });

    render(<MaintenanceBanner />);
    expect(screen.getByText("Custom maintenance message")).toBeInTheDocument();
  });

  it("should display default message when no custom message provided", () => {
    vi.mocked(useReadOnlyMode).mockReturnValue({
      readOnlyMode: true,
      message: undefined,
    });

    render(<MaintenanceBanner />);
    // The component will use the translation key
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("System is in maintenance mode")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", () => {
    vi.mocked(useReadOnlyMode).mockReturnValue({
      readOnlyMode: true,
      message: "Maintenance mode active",
    });

    render(<MaintenanceBanner />);
    const banner = screen.getByRole("alert");
    expect(banner).toHaveAttribute("aria-live", "assertive");
    expect(banner).toHaveAttribute("role", "alert");
  });

  it("should display maintenance icon", () => {
    vi.mocked(useReadOnlyMode).mockReturnValue({
      readOnlyMode: true,
      message: "Maintenance",
    });

    render(<MaintenanceBanner />);
    const icon = screen.getByText("🛠️");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
