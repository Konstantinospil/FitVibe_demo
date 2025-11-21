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
        "auth.register.error": "Registration failed. Please try again.",
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
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "different" } });
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
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "password123",
        username: "john",
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
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
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
            message: "User already exists",
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
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
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
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent("Creating account...");
      expect(nameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
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
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        email: "test.user+tag@example.com",
        password: "password123",
        username: "test.user_tag", // Special characters replaced with underscores
        profile: {
          display_name: "Test User",
        },
      });
    });
  });
});
