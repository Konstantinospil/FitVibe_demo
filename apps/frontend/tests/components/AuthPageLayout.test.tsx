import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import AuthPageLayout from "../../src/components/AuthPageLayout";

vi.mock("../../src/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("../../src/components/LanguageSwitcher", () => ({
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

vi.mock("../../src/utils/idleScheduler", () => ({
  scheduleIdleTask: vi.fn((callback) => {
    // Execute immediately in tests
    callback();
    return { cancel: vi.fn() };
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "footer.terms": "Terms",
        "footer.privacy": "Privacy",
      };
      return translations[key] || key;
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("AuthPageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with eyebrow, title, and description", () => {
    render(
      <AuthPageLayout eyebrow="Test Eyebrow" title="Test Title" description="Test Description" />,
      { wrapper },
    );

    expect(screen.getByText("Test Eyebrow")).toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("should render children when provided", () => {
    render(
      <AuthPageLayout eyebrow="Eyebrow" title="Title" description="Description">
        <div data-testid="child-content">Child Content</div>
      </AuthPageLayout>,
      { wrapper },
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("should render header utilities (theme toggle and language switcher)", () => {
    render(<AuthPageLayout eyebrow="Eyebrow" title="Title" description="Description" />, {
      wrapper,
    });

    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("should render footer with terms and privacy links", () => {
    render(<AuthPageLayout eyebrow="Eyebrow" title="Title" description="Description" />, {
      wrapper,
    });

    const termsLink = screen.getByRole("link", { name: /terms/i });
    const privacyLink = screen.getByRole("link", { name: /privacy/i });

    expect(termsLink).toBeInTheDocument();
    expect(privacyLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("should have proper layout structure", () => {
    const { container } = render(
      <AuthPageLayout eyebrow="Eyebrow" title="Title" description="Description" />,
      { wrapper },
    );

    // Should have min-height for full viewport
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveStyle({ minHeight: "100vh" });
  });
});
