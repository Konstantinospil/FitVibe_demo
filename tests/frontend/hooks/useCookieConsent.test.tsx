import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCookieConsent, shouldShowCookieBanner } from "../../src/hooks/useCookieConsent";
import { apiClient } from "../../src/services/api";

vi.mock("../../src/services/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const TestComponent = () => {
  const { consentStatus, isLoading, error, savePreferences } = useCookieConsent();
  if (isLoading) {
    return <div>Loading</div>;
  }
  return (
    <div>
      <div>{consentStatus?.hasConsent ? "HasConsent" : "NoConsent"}</div>
      <div>{error ? "Error" : "NoError"}</div>
      <button
        type="button"
        onClick={() => {
          void savePreferences({
            essential: true,
            preferences: false,
            analytics: false,
            marketing: false,
          }).catch(() => {});
        }}
      >
        Save
      </button>
    </div>
  );
};

describe("useCookieConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loads consent status from API", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { hasConsent: true, consent: { essential: true } } },
    });

    render(<TestComponent />);

    expect(await screen.findByText("HasConsent")).toBeInTheDocument();
    expect(screen.getByText("NoError")).toBeInTheDocument();
  });

  it("defaults to no consent on connection errors", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));

    render(<TestComponent />);

    expect(await screen.findByText("NoConsent")).toBeInTheDocument();
    expect(screen.getByText("NoError")).toBeInTheDocument();
  });

  it("sets error on non-connection failures", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Boom"));

    render(<TestComponent />);

    expect(await screen.findByText("NoConsent")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("saves preferences and sets localStorage", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { hasConsent: false } },
    });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          essential: true,
          preferences: false,
          analytics: false,
          marketing: false,
          version: "v1",
          updatedAt: "now",
        },
      },
    });

    render(<TestComponent />);

    await screen.findByText("NoConsent");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(localStorage.getItem("cookie-consent-banner-shown")).toBe("true"));
  });

  it("saves preferences with analytics and marketing enabled", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { hasConsent: false } },
    });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: {
          essential: true,
          preferences: true,
          analytics: true,
          marketing: true,
          version: "v2",
          updatedAt: "later",
        },
      },
    });

    render(<TestComponent />);

    await screen.findByText("NoConsent");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(localStorage.getItem("cookie-consent-banner-shown")).toBe("true"));
  });

  it("reports errors when saving preferences fails", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { hasConsent: false } },
    });
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Save failed"));

    render(<TestComponent />);

    await screen.findByText("NoConsent");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Error")).toBeInTheDocument());
  });

  it("respects the banner shown localStorage flag", () => {
    expect(shouldShowCookieBanner()).toBe(true);
    localStorage.setItem("cookie-consent-banner-shown", "true");
    expect(shouldShowCookieBanner()).toBe(false);
  });
});
