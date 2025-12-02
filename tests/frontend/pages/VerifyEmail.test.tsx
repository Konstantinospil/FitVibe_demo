import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import VerifyEmail from "../../src/pages/VerifyEmail";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { rawHttpClient } from "../../src/services/api";

// Mock API
vi.mock("../../src/services/api", () => ({
  rawHttpClient: {
    get: vi.fn(),
  },
}));

// Initialize i18n for tests
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "verifyEmail.eyebrow": "Email Verification",
        "verifyEmail.titleVerifying": "Verifying Your Email",
        "verifyEmail.titleSuccess": "Email Verified!",
        "verifyEmail.titleFailed": "Verification Failed",
        "verifyEmail.descVerifying": "Please wait while we verify your email...",
        "verifyEmail.descSuccess": "Your email has been successfully verified",
        "verifyEmail.descFailed": "We couldn't verify your email",
        "verifyEmail.noToken": "No verification token provided",
        "verifyEmail.goToLogin": "Go to Login",
        "verifyEmail.backToRegister": "Back to Register",
      },
    },
  },
});

const renderWithProviders = (token = "test-token") => {
  const search = token ? `?token=${token}` : "";
  return render(
    <MemoryRouter initialEntries={[`/verify-email${search}`]}>
      <I18nextProvider i18n={testI18n}>
        <VerifyEmail />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe("VerifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows success state after successful verification", async () => {
    vi.mocked(rawHttpClient.get).mockResolvedValue({ data: { success: true } });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
      expect(screen.getByText("Your email has been successfully verified")).toBeInTheDocument();
    });

    // Should have "Go to Login" button
    const loginButton = screen.getByRole("button", { name: /go to login/i });
    expect(loginButton).toBeInTheDocument();
  });

  it("shows error state on verification failure", async () => {
    vi.mocked(rawHttpClient.get).mockRejectedValue({
      response: {
        data: {
          error: {
            message: "Invalid token",
          },
        },
      },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid token")).toBeInTheDocument();
    });

    // Should have "Back to Register" button
    const registerButton = screen.getByRole("button", { name: /back to register/i });
    expect(registerButton).toBeInTheDocument();
  });

  it("shows error when no token is provided", async () => {
    renderWithProviders("");

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("No verification token provided")).toBeInTheDocument();
    });
  });

  it("shows generic error message on unknown error", async () => {
    vi.mocked(rawHttpClient.get).mockRejectedValue(new Error("Network error"));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Verification failed")).toBeInTheDocument();
    });
  });

  it("calls API with correct token parameter", async () => {
    vi.mocked(rawHttpClient.get).mockResolvedValue({ data: { success: true } });

    renderWithProviders("abc123");

    await waitFor(() => {
      expect(rawHttpClient.get).toHaveBeenCalledWith("/api/v1/auth/verify?token=abc123");
    });
  });

  it("shows verifying state initially", () => {
    vi.mocked(rawHttpClient.get).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    renderWithProviders();

    expect(screen.getByText("Verifying Your Email")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we verify your email...")).toBeInTheDocument();
  });

  it("displays success state with login button", async () => {
    vi.mocked(rawHttpClient.get).mockResolvedValue({ data: { success: true } });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /go to login/i })).toBeInTheDocument();
    });
  });

  it("handles button clicks for navigation", async () => {
    vi.mocked(rawHttpClient.get).mockResolvedValue({ data: { success: true } });

    const { getByRole } = renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Email Verified!")).toBeInTheDocument();
    });

    // Wait for button to be present before clicking
    const loginButton = await screen.findByRole("button", { name: /go to login/i });
    expect(loginButton).toBeInTheDocument();
    
    // Verify button is clickable
    expect(loginButton).not.toBeDisabled();
    
    fireEvent.click(loginButton);
    
    // After clicking, the button should trigger navigation
    // The component may unmount or navigate, so we just verify it was clickable
  });

  it("handles error without response object", async () => {
    vi.mocked(rawHttpClient.get).mockRejectedValue(new Error("Network error"));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Verification failed")).toBeInTheDocument();
    });
  });

  it("handles error with response but no error message", async () => {
    vi.mocked(rawHttpClient.get).mockRejectedValue({
      response: {
        data: {},
      },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Verification failed")).toBeInTheDocument();
    });
  });

  it("uses errorMessage in description when error occurs", async () => {
    vi.mocked(rawHttpClient.get).mockRejectedValue({
      response: {
        data: {
          error: {
            message: "Token expired",
          },
        },
      },
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Token expired")).toBeInTheDocument();
    });
  });
});
