import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Cookie from "../../src/pages/Cookie";

// Mock i18n config module - define translations first
const mockTranslations: Record<string, string | string[]> = {
  "cookie.title": "Cookie Policy", // Used by component to check if translations are loaded
  "cookie.eyebrow": "Cookie Policy",
  "cookie.policy.title": "Cookie Policy",
  "cookie.policy.description": "How we use cookies",
  "cookie.effectiveDate": "Effective Date",
  "cookie.effectiveDateValue": "2024-06-01",
  "cookie.section1.title": "1. What are cookies?",
  "cookie.section1.content": "Cookies are small text files...",
  "cookie.section2.title": "2. Types of cookies",
  "cookie.section2.items": ["Essential cookies", "Functional cookies"],
  "cookie.section3.title": "3. How we use cookies",
  "cookie.section3.content": "We use cookies to...",
  "cookie.section4.title": "4. Managing cookies",
  "cookie.section4.items": ["Browser settings", "Cookie preferences"],
  "cookie.section5.title": "5. Third-party cookies",
  "cookie.section5.content": "Some cookies are set by...",
  "cookie.section6.title": "6. Updates to this policy",
  "cookie.section6.content": "We may update this policy...",
  "cookie.section7.title": "7. Contact us",
  "cookie.section7.content": "For questions about cookies...",
  "navigation.home": "Home",
  "auth.login.title": "Login",
};

vi.mock("../../src/i18n/config", () => ({
  default: {
    t: (key: string) => {
      return mockTranslations[key as keyof typeof mockTranslations] || key;
    },
  },
  translationsLoadingPromise: Promise.resolve(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) => {
      const translations: Record<string, string | string[] | Record<string, unknown>> =
        mockTranslations;
      const value = translations[key];
      if (options?.returnObjects && value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }
      if (options?.returnObjects && Array.isArray(value)) {
        return value;
      }
      return typeof value === "string" ? value : key;
    },
  }),
}));

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      isAuthenticated: false,
      user: null,
    }),
  ),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Cookie page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render cookie policy content", async () => {
    render(
      <MemoryRouter>
        <Cookie />
      </MemoryRouter>,
    );

    // Wait for translations to load and component to render
    await waitFor(
      () => {
        const titles = screen.getAllByText("Cookie Policy");
        expect(titles.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
    const descriptions = screen.getAllByText("How we use cookies");
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it("should display effective date", async () => {
    render(
      <MemoryRouter>
        <Cookie />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Effective Date/i)).toBeInTheDocument();
        expect(screen.getByText("2024-06-01")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should render cookie sections", async () => {
    render(
      <MemoryRouter>
        <Cookie />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("1. What are cookies?")).toBeInTheDocument();
        expect(screen.getByText("2. Types of cookies")).toBeInTheDocument();
        expect(screen.getByText("3. How we use cookies")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should render home/login button", async () => {
    render(
      <MemoryRouter>
        <Cookie />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        const buttons = screen.getAllByRole("button");
        const homeButton = buttons.find(
          (btn) => btn.textContent?.includes("Login") || btn.textContent?.includes("Home"),
        );
        expect(homeButton).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
