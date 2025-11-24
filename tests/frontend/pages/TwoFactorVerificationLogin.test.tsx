import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TwoFactorVerificationLogin from "../../src/pages/TwoFactorVerificationLogin";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as api from "../../src/services/api";
import { AuthProvider } from "../../src/contexts/AuthContext";

// Mock API
vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    verify2FALogin: vi.fn(),
  };
});

// Initialize i18n for tests
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "auth.twoFactor.eyebrow": "Two-Factor Authentication",
        "auth.twoFactor.title": "Enter Your Code",
        "auth.twoFactor.description": "Enter the 6-digit code from your authenticator app",
        "auth.twoFactor.securityNotice": "This extra step ensures it's really you signing in",
        "auth.twoFactor.codeLabel": "Authentication Code",
        "auth.twoFactor.codeHint": "6-digit code or backup code",
        "auth.twoFactor.verify": "Verify and Continue",
        "auth.twoFactor.verifying": "Verifying...",
        "auth.twoFactor.backToLogin": "Back to login",
        "auth.twoFactor.invalidCode": "Invalid 2FA code. Please try again.",
        "auth.twoFactor.sessionExpired": "Session expired. Please log in again.",
        "auth.twoFactor.error": "Verification failed. Please try again.",
      },
    },
  },
});

const renderWithProviders = (locationState = { pendingSessionId: "session123", from: "/" }) => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/login/verify-2fa", state: locationState }]}>
      <I18nextProvider i18n={testI18n}>
        <AuthProvider>
          <Routes>
            <Route path="/login/verify-2fa" element={<TwoFactorVerificationLogin />} />
          </Routes>
        </AuthProvider>
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe("TwoFactorVerificationLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 2FA verification form", () => {
    renderWithProviders();

    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
    expect(screen.getByText("Enter Your Code")).toBeInTheDocument();
    expect(
      screen.getByText("Enter the 6-digit code from your authenticator app"),
    ).toBeInTheDocument();
    expect(screen.getByText("Authentication Code")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("displays security notice", () => {
    renderWithProviders();

    expect(
      screen.getByText("This extra step ensures it's really you signing in"),
    ).toBeInTheDocument();
  });

  it("allows only numeric input and limits to 6 digits", () => {
    renderWithProviders();

    const codeInput = screen.getByRole("textbox");

    // Should allow numbers
    fireEvent.change(codeInput, { target: { value: "123456" } });
    expect(codeInput).toHaveValue("123456");

    // Should strip non-numeric characters
    fireEvent.change(codeInput, { target: { value: "12abc34" } });
    expect(codeInput).toHaveValue("1234");

    // Should limit to 6 digits
    fireEvent.change(codeInput, { target: { value: "1234567890" } });
    expect(codeInput).toHaveValue("123456");
  });

  it("disables submit button when code is not 6 digits", () => {
    renderWithProviders();

    const submitButton = screen.getByRole("button", { name: /verify and continue/i });

    // Should be disabled initially
    expect(submitButton).toBeDisabled();

    // Should be disabled with less than 6 digits
    const codeInput = screen.getByRole("textbox");
    fireEvent.change(codeInput, { target: { value: "12345" } });
    expect(submitButton).toBeDisabled();

    // Should be enabled with exactly 6 digits
    fireEvent.change(codeInput, { target: { value: "123456" } });
    expect(submitButton).not.toBeDisabled();
  });

  it("handles successful 2FA verification", async () => {
    vi.mocked(api.verify2FALogin).mockResolvedValue({
      user: { id: "123", username: "testuser", email: "test@example.com" },
      session: { id: "session123" },
    });

    renderWithProviders();

    const codeInput = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button", { name: /verify and continue/i });

    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.verify2FALogin).toHaveBeenCalledWith({
        pendingSessionId: "session123",
        code: "123456",
      });
    });
  });

  it("displays error for invalid 2FA code", async () => {
    vi.mocked(api.verify2FALogin).mockRejectedValue({
      response: {
        data: {
          error: {
            code: "AUTH_INVALID_2FA_CODE",
          },
        },
      },
    });

    renderWithProviders();

    const codeInput = screen.getByRole("textbox");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify and continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid 2FA code. Please try again.");
    });
  });

  it("displays generic error message", async () => {
    vi.mocked(api.verify2FALogin).mockRejectedValue(new Error("Network error"));

    renderWithProviders();

    const codeInput = screen.getByRole("textbox");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify and continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Verification failed. Please try again.");
    });
  });

  it("disables form during submission", async () => {
    vi.mocked(api.verify2FALogin).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderWithProviders();

    const codeInput = screen.getByRole("textbox");
    const submitButton = screen.getByRole("button", { name: /verify and continue/i });

    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent("Verifying...");
      expect(codeInput).toBeDisabled();
    });
  });

  it("renders back to login button", () => {
    renderWithProviders();

    const backButton = screen.getByRole("button", { name: /back to login/i });
    expect(backButton).toBeInTheDocument();
  });
});
