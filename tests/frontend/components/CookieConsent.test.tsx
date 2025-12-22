import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CookieConsent from "../../src/components/CookieConsent";
import { useCookieConsent } from "../../src/hooks/useCookieConsent";

vi.mock("../../src/hooks/useCookieConsent");

const mockSavePreferences = vi.fn();
const mockUseCookieConsent = vi.mocked(useCookieConsent);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "cookie.title": "Cookie Preferences",
        "cookie.description": "We use cookies to enhance your experience",
        "cookie.intro": "This website uses cookies",
        "cookie.categories.essential.label": "Essential Cookies",
        "cookie.categories.essential.description": "Required for the site to function",
        "cookie.categories.preferences.label": "Preferences",
        "cookie.categories.preferences.description": "Remember your preferences",
        "cookie.categories.analytics.label": "Analytics",
        "cookie.categories.analytics.description": "Help us improve the site",
        "cookie.categories.marketing.label": "Marketing",
        "cookie.categories.marketing.description": "Personalized advertising",
        "cookie.required": "Required",
        "cookie.enabled": "enabled",
        "cookie.disabled": "disabled",
        "cookie.policy.title": "Cookie Policy",
        "cookie.policy.description": "Read our cookie policy",
        "cookie.policy.link": "here",
        "cookie.actions.rejectAll": "Reject All",
        "cookie.actions.acceptAll": "Accept All",
        "cookie.actions.savePreferences": "Save Preferences",
      };
      return translations[key] || key;
    },
  }),
}));

describe("CookieConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSavePreferences.mockResolvedValue(undefined);
    // Reset mock implementation
    mockUseCookieConsent.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("should not render when consent exists", () => {
    mockUseCookieConsent.mockReturnValue({
      consentStatus: {
        hasConsent: true,
        consent: {
          essential: true,
          preferences: true,
          analytics: false,
          marketing: false,
        },
      },
      isLoading: false,
      savePreferences: mockSavePreferences,
    });

    const { container } = render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render when no consent exists", async () => {
    mockUseCookieConsent.mockReturnValue({
      consentStatus: {
        hasConsent: false,
        consent: null,
      },
      isLoading: false,
      savePreferences: mockSavePreferences,
    });

    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Cookie Preferences")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should not render when loading", () => {
    mockUseCookieConsent.mockReturnValue({
      consentStatus: null,
      isLoading: true,
      savePreferences: mockSavePreferences,
    });

    const { container } = render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });
});
