import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ResetPassword from "../../src/pages/ResetPassword";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as api from "../../src/services/api";

// Mock API
vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    resetPassword: vi.fn(),
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
        "resetPassword.eyebrow": "Password Reset",
        "resetPassword.title": "Reset Your Password",
        "resetPassword.description": "Choose a new password for your account",
        "resetPassword.titleSuccess": "Password Reset Successfully",
        "resetPassword.descSuccess": "Your password has been reset",
        "resetPassword.successText": "You can now log in with your new password",
        "resetPassword.newPasswordLabel": "New Password",
        "resetPassword.newPasswordPlaceholder": "Enter new password",
        "resetPassword.confirmPasswordLabel": "Confirm Password",
        "resetPassword.confirmPasswordPlaceholder": "Confirm your password",
        "resetPassword.resetButton": "Reset Password",
        "resetPassword.resetting": "Resetting...",
        "resetPassword.backToLogin": "Back to Login",
        "resetPassword.passwordMismatch": "Passwords do not match",
        "resetPassword.invalidToken": "Invalid or expired reset token",
        "resetPassword.errorReset": "Failed to reset password",
        "resetPassword.passwordRequirements.title": "Password Requirements:",
        "resetPassword.passwordRequirements.minLength": "At least 12 characters",
        "resetPassword.passwordRequirements.uppercase": "At least one uppercase letter",
        "resetPassword.passwordRequirements.lowercase": "At least one lowercase letter",
        "resetPassword.passwordRequirements.digit": "At least one digit",
        "resetPassword.passwordRequirements.special": "At least one special character",
        "auth.showPassword": "Show password",
        "auth.hidePassword": "Hide password",
      },
    },
  },
});

const renderWithProviders = (token = "test-token") => {
  const search = token ? `?token=${token}` : "";
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <I18nextProvider i18n={testI18n}>
        <ResetPassword />
      </I18nextProvider>
    </MemoryRouter>,
  );
};

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders reset password form", () => {
    renderWithProviders();

    expect(screen.getByText("Password Reset")).toBeInTheDocument();
    expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
    expect(screen.getByText("Choose a new password for your account")).toBeInTheDocument();
  });

  it("displays password requirements", () => {
    renderWithProviders();

    expect(screen.getByText("Password Requirements:")).toBeInTheDocument();
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
    expect(screen.getByText(/At least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/At least one lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/At least one digit/i)).toBeInTheDocument();
    expect(screen.getByText(/At least one special character/i)).toBeInTheDocument();
  });

  it("has password visibility toggles", () => {
    renderWithProviders();

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const showButtons = screen.getAllByLabelText(/show password/i);
    expect(showButtons).toHaveLength(2);
  });

  it("toggles password visibility on mouse interaction", () => {
    renderWithProviders();

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const toggleButton = screen.getAllByLabelText(/show password/i)[0];

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.mouseDown(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.mouseUp(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("validates password match", async () => {
    renderWithProviders();

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    act(() => {
      fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPassword123!" } });
      fireEvent.click(submitButton);
    });

    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/passwords do not match/i);
      },
      { timeout: 1000 },
    );

    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it("validates token presence", async () => {
    renderWithProviders("");

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    act(() => {
      fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });
      fireEvent.click(submitButton);
    });

    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/invalid or expired reset token/i);
      },
      { timeout: 1000 },
    );

    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it("handles successful password reset", async () => {
    vi.mocked(api.resetPassword).mockResolvedValue({} as any);

    renderWithProviders("valid-token");

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });
    fireEvent.click(submitButton);

    await waitFor(
      () => {
        expect(api.resetPassword).toHaveBeenCalledWith(
          expect.objectContaining({
            token: "valid-token",
            newPassword: "NewPassword123!",
          }),
        );
      },
      { timeout: 3000 },
    );

    // Should show success screen
    await waitFor(() => {
      expect(screen.getByText("Password Reset Successfully")).toBeInTheDocument();
      expect(screen.getByText("Your password has been reset")).toBeInTheDocument();
      expect(screen.getByText("You can now log in with your new password")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("displays error message on failure", async () => {
    vi.mocked(api.resetPassword).mockRejectedValue(new Error("Reset failed"));

    renderWithProviders();

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    act(() => {
      fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    });

    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/failed to reset password/i);
      },
      { timeout: 1000 },
    );
  });

  it("displays custom error message from API", async () => {
    vi.mocked(api.resetPassword).mockRejectedValue({
      response: {
        data: {
          error: {
            message: "Token has expired",
          },
        },
      },
    });

    renderWithProviders();

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    act(() => {
      fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    });

    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/token has expired/i);
      },
      { timeout: 1000 },
    );
  });

  it("disables form during submission", async () => {
    vi.mocked(api.resetPassword).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderWithProviders();

    const passwordInput = screen.getByPlaceholderText(/enter new password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    act(() => {
      fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });
      fireEvent.click(submitButton);
    });

    await waitFor(
      () => {
        expect(submitButton).toHaveTextContent("Resetting...");
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
      },
      { timeout: 1000 },
    );
  });

  it("renders back to login link", () => {
    renderWithProviders();

    const loginLink = screen.getByRole("link", { name: /back to login/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
