import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TermsReacceptance from "../../src/pages/TermsReacceptance";
import * as api from "../../src/services/api";
import { useAuth } from "../../src/contexts/AuthContext";

const mockNavigate = vi.fn();
const mockSignOut = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    NavLink: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../src/services/api", () => ({
  acceptTerms: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.termsReacceptance.eyebrow": "Terms Update",
        "auth.termsReacceptance.title": "Terms and Conditions Update",
        "auth.termsReacceptance.description": "Please accept the updated terms",
        "auth.termsReacceptance.notice": "Our terms have been updated",
        "auth.termsReacceptance.acceptTerms": "I accept the",
        "auth.termsReacceptance.termsLink": "Terms",
        "auth.termsReacceptance.and": "and",
        "auth.termsReacceptance.privacyLink": "Privacy Policy",
        "auth.termsReacceptance.submit": "Accept",
        "auth.termsReacceptance.submitting": "Accepting...",
        "auth.termsReacceptance.signOut": "Sign Out",
        "auth.termsReacceptance.termsRequired": "You must accept the terms",
        "auth.termsReacceptance.error": "Failed to accept terms",
        "errors.NETWORK_ERROR": "Network error",
      };
      return translations[key] || key;
    },
    i18n: {
      language: "en",
    },
  }),
}));

describe("TermsReacceptance page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      signIn: vi.fn(),
      signOut: mockSignOut,
      user: null,
      isAuthenticated: false,
      updateUser: vi.fn(),
    });
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        reload: reloadSpy,
      },
      writable: true,
      configurable: true,
    });
  });

  it("should render terms reacceptance form", () => {
    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    expect(screen.getByText("Terms and Conditions Update")).toBeInTheDocument();
    expect(screen.getByText("Please accept the updated terms")).toBeInTheDocument();
    expect(screen.getByText("Our terms have been updated")).toBeInTheDocument();
  });

  it("should show error when submitting without accepting terms", async () => {
    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole("button", { name: "Accept" });
    const form = submitButton.closest("form");
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(submitButton);
    }

    await waitFor(
      () => {
        const errorElement = screen.queryByText("You must accept the terms");
        const alert = screen.queryByRole("alert");
        // Either the error text or an alert should be present
        expect(errorElement || alert).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it("should submit form when terms are accepted", async () => {
    vi.mocked(api.acceptTerms).mockResolvedValue({ message: "Terms accepted" });

    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Accept" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.acceptTerms).toHaveBeenCalledWith({ terms_accepted: true });
    });
  });

  it("should reload page after successful submission", async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        reload: reloadSpy,
      },
      writable: true,
      configurable: true,
    });

    vi.mocked(api.acceptTerms).mockResolvedValue({ message: "Terms accepted" });

    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Accept" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  it("should show error message when API call fails", async () => {
    vi.mocked(api.acceptTerms).mockRejectedValue({
      response: {
        data: {
          error: {
            code: "NETWORK_ERROR",
            message: "Network error",
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Accept" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should show generic error when API call fails without error code", async () => {
    vi.mocked(api.acceptTerms).mockRejectedValue(new Error("Unknown error"));

    render(<TermsReacceptance />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Accept" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to accept terms")).toBeInTheDocument();
    });
  });

  it("should disable form while submitting", async () => {
    vi.mocked(api.acceptTerms).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Accept" });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(checkbox).toBeDisabled();

    await waitFor(() => {
      expect(api.acceptTerms).toHaveBeenCalled();
    });
  });

  it("should allow signing out", () => {
    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const signOutButton = screen.getByRole("button", { name: "Sign Out" });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("should render links to terms and privacy", () => {
    render(
      <MemoryRouter>
        <TermsReacceptance />
      </MemoryRouter>,
    );

    const termsLink = screen.getByText("Terms");
    const privacyLink = screen.getByText("Privacy Policy");

    expect(termsLink.closest("a")).toHaveAttribute("href", "/terms");
    expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy");
  });
});
