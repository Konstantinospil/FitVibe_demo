import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ForgotPassword from "../../src/pages/ForgotPassword";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as api from "../../src/services/api";

// Mock API
vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    forgotPassword: vi.fn(),
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
        "forgotPassword.eyebrow": "Password Reset",
        "forgotPassword.title": "Forgot Password",
        "forgotPassword.description": "Enter your email to reset your password",
        "forgotPassword.titleSuccess": "Check Your Email",
        "forgotPassword.descSuccess": "We've sent you a password reset link",
        "forgotPassword.successMessage": "Password reset link sent to your email",
        "forgotPassword.emailLabel": "Email",
        "forgotPassword.emailPlaceholder": "you@example.com",
        "forgotPassword.sendLink": "Send Reset Link",
        "forgotPassword.sending": "Sending...",
        "forgotPassword.backToLogin": "Back to Login",
        "forgotPassword.errorSend": "Failed to send reset link",
        "validation.required": "This field is required",
      },
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>
    </BrowserRouter>,
  );
};

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders forgot password form", () => {
    const { container } = renderWithProviders(<ForgotPassword />);

    expect(screen.getByText("Password Reset")).toBeInTheDocument();
    expect(screen.getByText("Forgot Password")).toBeInTheDocument();
    expect(screen.getByText("Enter your email to reset your password")).toBeInTheDocument();
    // Use container query to avoid multiple element issues
    const emailInput = container.querySelector('input[type="email"]');
    expect(emailInput).not.toBeNull();
    // Use getAllByRole to handle multiple buttons (test isolation)
    const buttons = screen.getAllByRole("button", { name: /send reset link/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders back to login link", () => {
    renderWithProviders(<ForgotPassword />);

    // Use getAllByRole to handle multiple links (one in form, might be others)
    const loginLinks = screen.getAllByRole("link", { name: /back to login/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute("href", "/login");
  });

  it("handles successful password reset request", async () => {
    const mockForgotPassword = vi.mocked(api.forgotPassword);
    mockForgotPassword.mockResolvedValue({} as any);

    const { container } = renderWithProviders(<ForgotPassword />);

    // Wait for email input to be rendered
    const emailInput = await waitFor(
      () => {
        const input = container.querySelector('input[type="email"]') as HTMLInputElement;
        if (!input) {
          throw new Error("Email input not found");
        }
        return input;
      },
      { timeout: 3000 },
    );

    // Get submit button
    const buttons = screen.getAllByRole("button", { name: /send reset link/i });
    const submitButton = buttons[buttons.length - 1];

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      // Wait a bit for state to update
      await new Promise((resolve) => setTimeout(resolve, 10));
      fireEvent.click(submitButton);
    });

    // Wait for API to be called
    await waitFor(
      () => {
        expect(mockForgotPassword).toHaveBeenCalledWith({ email: "test@example.com" });
      },
      { timeout: 3000 },
    );

    // Wait for success screen - the component should re-render with success state
    await waitFor(
      () => {
        expect(screen.getByText("Check Your Email")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByText("Password reset link sent to your email")).toBeInTheDocument();
  });

  it("displays error message on failure", async () => {
    const mockForgotPassword = vi.mocked(api.forgotPassword);
    mockForgotPassword.mockRejectedValue(new Error("Failed to send"));

    const { container } = renderWithProviders(<ForgotPassword />);

    // Wait for email input to be rendered
    const emailInput = await waitFor(
      () => {
        const input = container.querySelector('input[type="email"]') as HTMLInputElement;
        if (!input) {
          throw new Error("Email input not found");
        }
        return input;
      },
      { timeout: 3000 },
    );

    // Get submit button
    const buttons = screen.getAllByRole("button", { name: /send reset link/i });
    const submitButton = buttons[buttons.length - 1];

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
      fireEvent.click(submitButton);
    });

    // Wait for API to be called
    await waitFor(
      () => {
        expect(mockForgotPassword).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for error to appear
    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        if (!alert) {
          throw new Error("Alert not found");
        }
        expect(alert).toHaveTextContent(/failed to send/i);
      },
      { timeout: 3000 },
    );
  });

  it("displays custom error message from API", async () => {
    const mockForgotPassword = vi.mocked(api.forgotPassword);
    mockForgotPassword.mockRejectedValue({
      response: {
        data: {
          error: {
            message: "Email not found",
          },
        },
      },
    });

    const { container } = renderWithProviders(<ForgotPassword />);

    // Wait for email input to be rendered
    const emailInput = await waitFor(
      () => {
        const input = container.querySelector('input[type="email"]') as HTMLInputElement;
        if (!input) {
          throw new Error("Email input not found");
        }
        return input;
      },
      { timeout: 3000 },
    );
    // Get submit button
    const buttons = screen.getAllByRole("button", { name: /send reset link/i });
    const submitButton = buttons[buttons.length - 1];

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "notfound@example.com" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
      fireEvent.click(submitButton);
    });

    // Wait for API to be called
    await waitFor(
      () => {
        expect(mockForgotPassword).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for error to appear
    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        if (!alert) {
          throw new Error("Alert not found");
        }
        expect(alert).toHaveTextContent("Email not found");
      },
      { timeout: 3000 },
    );
  });

  it("disables form during submission", async () => {
    vi.mocked(api.forgotPassword).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    const { container } = renderWithProviders(<ForgotPassword />);

    // Wait for email input to be rendered
    const emailInput = await waitFor(
      () => {
        const input = container.querySelector('input[type="email"]') as HTMLInputElement;
        if (!input) {
          throw new Error("Email input not found");
        }
        return input;
      },
      { timeout: 3000 },
    );
    const form = emailInput.closest("form");
    // Use getAllByRole to handle multiple buttons (test isolation)
    const buttons = screen.getAllByRole("button", { name: /send reset link/i });
    const submitButton = buttons[buttons.length - 1]; // Get the last one (most recent)

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.click(submitButton);
    });

    await waitFor(
      () => {
        expect(submitButton).toHaveTextContent("Sending...");
        expect(emailInput).toBeDisabled();
      },
      { timeout: 2000 },
    );
  });

  it("shows back to login link on success screen", async () => {
    const mockForgotPassword = vi.mocked(api.forgotPassword);
    mockForgotPassword.mockResolvedValue({} as any);

    const { container } = renderWithProviders(<ForgotPassword />);

    // Wait for email input to be rendered
    const emailInput = await waitFor(
      () => {
        const input = container.querySelector('input[type="email"]') as HTMLInputElement;
        if (!input) {
          throw new Error("Email input not found");
        }
        return input;
      },
      { timeout: 3000 },
    );

    // Get submit button
    const buttons = screen.getAllByRole("button", { name: /send reset link/i });
    const submitButton = buttons[buttons.length - 1];

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      await new Promise((resolve) => setTimeout(resolve, 10));
      fireEvent.click(submitButton);
    });

    // Wait for API to be called
    await waitFor(
      () => {
        expect(mockForgotPassword).toHaveBeenCalledWith({ email: "test@example.com" });
      },
      { timeout: 3000 },
    );

    // Wait for success screen - email input will be gone, replaced with success message
    await waitFor(
      () => {
        expect(screen.getByText("Check Your Email")).toBeInTheDocument();
        // Verify email input is no longer in the DOM (success state)
        const emailInputAfter = container.querySelector('input[type="email"]');
        expect(emailInputAfter).toBeNull();
      },
      { timeout: 5000 },
    );

    // Use getAllByRole and filter to avoid multiple elements issue
    const loginLinks = screen.getAllByRole("link", { name: /back to login/i });
    const loginLink = loginLinks[loginLinks.length - 1]; // Get the last one (from success screen)
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
