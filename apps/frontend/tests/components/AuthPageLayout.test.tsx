import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AuthPageLayout from "../../src/components/AuthPageLayout";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "footer.terms": "Terms",
        "footer.privacy": "Privacy",
      };
      return translations[key] || key;
    },
    i18n: {
      language: "en",
    },
  }),
}));

vi.mock("../../src/utils/idleScheduler", () => ({
  scheduleIdleTask: (cb: () => void) => {
    cb();
    return { cancel: vi.fn() };
  },
}));

describe("AuthPageLayout", () => {
  it("should render with eyebrow, title, and description", () => {
    render(
      <MemoryRouter>
        <AuthPageLayout eyebrow="Test" title="Test Title" description="Test Description">
          <div>Test Content</div>
        </AuthPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render footer links", () => {
    render(
      <MemoryRouter>
        <AuthPageLayout eyebrow="Test" title="Test Title" description="Test Description">
          <div>Content</div>
        </AuthPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("should render header utilities after idle task", () => {
    render(
      <MemoryRouter>
        <AuthPageLayout eyebrow="Test" title="Test Title" description="Test Description">
          <div>Content</div>
        </AuthPageLayout>
      </MemoryRouter>,
    );

    // ThemeToggle and LanguageSwitcher should be rendered after idle task
    // Since we mock scheduleIdleTask to call immediately, they should be present
    const headerUtilities = document.querySelector('[style*="top"]');
    expect(headerUtilities).toBeInTheDocument();
  });
});
