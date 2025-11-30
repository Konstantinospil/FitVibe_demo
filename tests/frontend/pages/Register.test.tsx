import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Register from "../../src/pages/Register";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as api from "../../src/services/api";

// Mock API
vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    register: vi.fn(),
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
        "auth.register.eyebrow": "Join FitVibe",
        "auth.register.title": "Create Account",
        "auth.register.description": "Start your fitness journey",
        "auth.register.successTitle": "Account Created!",
        "auth.register.successDescription": "Check your email to verify your account",
        "auth.register.nameLabel": "Full Name",
        "auth.register.emailLabel": "Email",
        "auth.register.passwordLabel": "Password",
        "auth.register.confirmPasswordLabel": "Confirm Password",
        "auth.register.submit": "Create Account",
        "auth.register.submitting": "Creating account...",
        "auth.register.loginPrompt": "Already have an account?",
        "auth.register.loginLink": "Sign in",
        "auth.showPassword": "Show password",
        "auth.hidePassword": "Hide password",
        "auth.register.passwordMismatch": "Passwords do not match",
        "auth.register.passwordsDoNotMatch": "Passwords do not match",
        "auth.register.error": "Registration failed. Please try again.",
        "auth.register.fillAllFields": "Please fill in all fields",
        "auth.register.acceptTerms": "I have read and accept the",
        "auth.register.termsLink": "Terms and Conditions",
        "auth.register.and": "and",
        "auth.register.privacyLink": "Privacy Policy",
        "auth.register.termsRequired":
          "You must accept the Terms and Conditions and Privacy Policy to create an account",
        "auth.register.passwordMinLength": "Password must be at least 12 characters long",
        "auth.register.passwordLowercase": "Password must contain at least one lowercase letter",
        "auth.register.passwordUppercase": "Password must contain at least one uppercase letter",
        "auth.register.passwordDigit": "Password must contain at least one digit",
        "auth.register.passwordSymbol": "Password must contain at least one symbol",
        "auth.register.passwordSymbolAlt": "Password must contain at least one special character",
        "auth.placeholders.name": "John Doe",
        "auth.placeholders.email": "you@example.com",
        "auth.placeholders.password": "Create a strong password",
        "auth.placeholders.confirmPassword": "Confirm your password",
        "errors.USER_ALREADY_EXISTS": "An account with this email already exists",
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

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders registration form", () => {
    renderWithProviders(<Register />);

    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/create a strong password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^create account$/i })).toBeInTheDocument();
  });

  it("shows password visibility toggles", () => {
    renderWithProviders(<Register />);

    const passwordToggles = screen.getAllByLabelText(/show password/i);
    expect(passwordToggles).toHaveLength(2); // One for password, one for confirm password

    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(passwordToggles[0]);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(passwordToggles[1]);
    expect(confirmPasswordInput).toHaveAttribute("type", "text");
  });

  it("validates password match", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Different123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("handles successful registration", async () => {
    vi.mocked(api.register).mockResolvedValue({
      user: { id: "123", username: "john", email: "john@example.com" },
      session: { id: "session123" },
    });

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "Password123!",
        username: "john",
        terms_accepted: true,
        profile: {
          display_name: "John Doe",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Account Created!")).toBeInTheDocument();
      expect(screen.getByText("Check your email to verify your account")).toBeInTheDocument();
    });
  });

  it("displays error message on registration failure", async () => {
    vi.mocked(api.register).mockRejectedValue(new Error("Registration failed"));

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Registration failed. Please try again.");
    });
  });

  it("handles user already exists error", async () => {
    vi.mocked(api.register).mockRejectedValue({
      response: {
        data: {
          error: {
            code: "USER_ALREADY_EXISTS",
            // Don't provide message so it uses the translation
          },
        },
      },
    });

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "existing@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "An account with this email already exists",
      );
    });
  });

  it("disables form during submission", async () => {
    vi.mocked(api.register).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent("Creating account...");
      expect(nameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(termsCheckbox).toBeDisabled();
    });
  });

  it("renders login link", () => {
    renderWithProviders(<Register />);

    const loginLink = screen.getByRole("link", { name: /sign in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("generates username from email", async () => {
    vi.mocked(api.register).mockResolvedValue({
      user: { id: "456", username: "test.user_tag", email: "test.user+tag@example.com" },
      session: { id: "session456" },
    });

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test.user+tag@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        email: "test.user+tag@example.com",
        password: "Password123!",
        username: "test.user_tag", // Special characters replaced with underscores
        terms_accepted: true,
        profile: {
          display_name: "Test User",
        },
      });
    });
  });

  it("validates password minimum length", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Short1!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Short1!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password must be at least 12 characters long",
      );
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("validates password contains lowercase letter", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "PASSWORD123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "PASSWORD123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password must contain at least one lowercase letter",
      );
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("validates password contains uppercase letter", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password must contain at least one uppercase letter",
      );
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("validates password contains digit", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "PasswordLong!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "PasswordLong!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password must contain at least one digit",
      );
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("validates password contains symbol", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123Long" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123Long" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password must contain at least one symbol",
      );
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("requires terms acceptance", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    // Don't check terms checkbox
    fireEvent.click(submitButton);

    await waitFor(() => {
      const alert = screen.queryByRole("alert");
      if (alert) {
        expect(alert).toHaveTextContent(/accept.*terms/i);
      } else {
        // Fallback: check for error text anywhere
        expect(screen.getByText(/accept.*terms/i)).toBeInTheDocument();
      }
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("validates all fields are filled", async () => {
    renderWithProviders(<Register />);

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const alert = screen.queryByRole("alert");
      if (alert) {
        expect(alert).toHaveTextContent(/fill.*all.*fields/i);
      } else {
        // Fallback: check for error text anywhere
        expect(screen.getByText(/fill.*all.*fields/i)).toBeInTheDocument();
      }
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("handles error with only error message", async () => {
    vi.mocked(api.register).mockRejectedValue({
      response: {
        data: {
          error: {
            message: "Custom error message",
          },
        },
      },
    });

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Custom error message");
    });
  });

  it("handles error with translated error code", async () => {
    testI18n.addResource("en", "translation", "errors.UNKNOWN_ERROR", "An unknown error occurred");

    vi.mocked(api.register).mockRejectedValue({
      response: {
        data: {
          error: {
            code: "UNKNOWN_ERROR",
          },
        },
      },
    });

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("handles network error without response object", async () => {
    vi.mocked(api.register).mockRejectedValue(new Error("Network error"));

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("handles input focus and blur events", () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    // Test focus events
    fireEvent.focus(nameInput);
    expect(nameInput).toHaveStyle({ borderColor: "var(--color-accent, #34d399)" });

    fireEvent.focus(emailInput);
    expect(emailInput).toHaveStyle({ borderColor: "var(--color-accent, #34d399)" });

    fireEvent.focus(passwordInput);
    expect(passwordInput).toHaveStyle({ borderColor: "var(--color-accent, #34d399)" });

    fireEvent.focus(confirmPasswordInput);
    expect(confirmPasswordInput).toHaveStyle({ borderColor: "var(--color-accent, #34d399)" });

    // Test blur events
    fireEvent.blur(nameInput);
    expect(nameInput).toHaveStyle({ borderColor: "var(--color-input-border)" });

    fireEvent.blur(emailInput);
    expect(emailInput).toHaveStyle({ borderColor: "var(--color-input-border)" });

    fireEvent.blur(passwordInput);
    expect(passwordInput).toHaveStyle({ borderColor: "var(--color-input-border)" });

    fireEvent.blur(confirmPasswordInput);
    expect(confirmPasswordInput).toHaveStyle({ borderColor: "var(--color-input-border)" });
  });

  it("handles password toggle hover states", () => {
    renderWithProviders(<Register />);

    const passwordToggles = screen.getAllByLabelText(/show password/i);
    const passwordToggle = passwordToggles[0];
    const confirmPasswordToggle = passwordToggles[1];

    // Test hover events
    fireEvent.mouseEnter(passwordToggle);
    expect(passwordToggle).toHaveStyle({ color: "var(--color-text-primary)" });

    fireEvent.mouseLeave(passwordToggle);
    expect(passwordToggle).toHaveStyle({ color: "var(--color-text-secondary)" });

    fireEvent.mouseEnter(confirmPasswordToggle);
    expect(confirmPasswordToggle).toHaveStyle({ color: "var(--color-text-primary)" });

    fireEvent.mouseLeave(confirmPasswordToggle);
    expect(confirmPasswordToggle).toHaveStyle({ color: "var(--color-text-secondary)" });
  });

  it("shows error styling on terms checkbox when error exists", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    // Don't check terms checkbox
    fireEvent.click(submitButton);

    await waitFor(() => {
      const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
      const termsLabel = termsCheckbox.closest("label");
      expect(termsLabel).toHaveStyle({
        border: expect.stringContaining("rgba(248, 113, 113, 0.5)"),
      });
    });
  });

  it("trims whitespace from name and email inputs", async () => {
    vi.mocked(api.register).mockResolvedValue({
      user: { id: "123", username: "john", email: "john@example.com" },
      session: { id: "session123" },
    });

    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "  John Doe  " } });
    fireEvent.change(emailInput, { target: { value: "  john@example.com  " } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "Password123!",
        username: "john",
        terms_accepted: true,
        profile: {
          display_name: "John Doe",
        },
      });
    });
  });

  it("handles empty name validation", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "   " } }); // Only whitespace
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(api.register).not.toHaveBeenCalled();
  });

  it("handles empty email validation", async () => {
    renderWithProviders(<Register />);

    const nameInput = screen.getByRole("textbox", { name: /full name/i });
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const passwordInput = screen.getByPlaceholderText(/create a strong password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "   " } }); // Only whitespace
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    const termsCheckbox = screen.getByRole("checkbox", { name: /accept the/i });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(api.register).not.toHaveBeenCalled();
  });
});
