import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Login from "../../src/pages/Login";
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
    login: vi.fn(),
  };
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
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
        "auth.login.eyebrow": "Welcome Back",
        "auth.login.title": "Sign In",
        "auth.login.description": "Log in to your account",
        "auth.login.emailLabel": "Email",
        "auth.login.passwordLabel": "Password",
        "auth.login.submit": "Sign In",
        "auth.login.submitting": "Signing in...",
        "auth.login.registerPrompt": "Create an account",
        "auth.login.forgot": "Forgot password?",
        "auth.login.error": "Invalid email or password",
        "auth.placeholders.email": "you@example.com",
        "auth.placeholders.password": "Enter your password",
        "auth.showPassword": "Show password",
        "auth.hidePassword": "Hide password",
      },
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>
        <AuthProvider>{ui}</AuthProvider>
      </I18nextProvider>
    </BrowserRouter>,
  );
};

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders login form", () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("shows password visibility toggle", () => {
    const { container } = renderWithProviders(<Login />);

    // Use getAllByLabelText to handle multiple elements (test isolation)
    const toggleButtons = screen.getAllByLabelText(/show password/i);
    const toggleButton = toggleButtons[toggleButtons.length - 1];
    expect(toggleButton).toBeInTheDocument();

    // Use container query to get the most recent password input
    const passwordInputs = container.querySelectorAll(
      'input[type="password"], input[type="text"][placeholder*="password" i]',
    );
    const passwordInput = Array.from(passwordInputs).find((input) =>
      (input as HTMLInputElement).placeholder.toLowerCase().includes("password"),
    ) as HTMLInputElement;
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    const hideButtons = screen.getAllByLabelText(/hide password/i);
    expect(hideButtons.length).toBeGreaterThan(0);
  });

  it("handles form submission successfully without 2FA", async () => {
    vi.mocked(api.login).mockResolvedValue({
      requires2FA: false,
      user: { id: "123", username: "testuser", email: "test@example.com" },
      session: { id: "session123" },
    });

    const { container } = renderWithProviders(<Login />);

    // Use container query to avoid multiple element issues
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    if (!emailInput) {
      throw new Error("Email input not found");
    }
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    if (!passwordInput) {
      throw new Error("Password input not found");
    }
    const form = emailInput.closest("form");

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      if (form) {
        fireEvent.submit(form);
      }
    });

    await waitFor(
      () => {
        expect(api.login).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "test@example.com",
            password: "password123",
          }),
        );
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("navigates to 2FA verification when 2FA is required", async () => {
    vi.mocked(api.login).mockResolvedValue({
      requires2FA: true,
      pendingSessionId: "pending123",
    });

    const { container } = renderWithProviders(<Login />);

    // Use container query to avoid multiple element issues
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    if (!emailInput) {
      throw new Error("Email input not found");
    }
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    if (!passwordInput) {
      throw new Error("Password input not found");
    }
    const form = emailInput.closest("form");

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      if (form) {
        fireEvent.submit(form);
      }
    });

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/login/verify-2fa", {
          state: {
            pendingSessionId: "pending123",
            from: "/",
          },
          replace: false,
        });
      },
      { timeout: 3000 },
    );
  });

  it("displays error message on login failure", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Invalid credentials"));

    const { container } = renderWithProviders(<Login />);

    // Use container query to avoid multiple element issues
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    if (!emailInput) {
      throw new Error("Email input not found");
    }
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    if (!passwordInput) {
      throw new Error("Password input not found");
    }
    const form = emailInput.closest("form");

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
      if (form) {
        fireEvent.submit(form);
      }
    });

    await waitFor(
      () => {
        const alert = screen.queryByRole("alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/invalid email or password|unable to connect/i);
      },
      { timeout: 1000 },
    );
  });

  it("disables form during submission", async () => {
    vi.mocked(api.login).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    const { container } = renderWithProviders(<Login />);

    // Use container query to avoid multiple element issues
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    if (!emailInput) {
      throw new Error("Email input not found");
    }
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    if (!passwordInput) {
      throw new Error("Password input not found");
    }
    const form = emailInput.closest("form");
    // Use getAllByRole to handle multiple buttons (test isolation)
    const buttons = screen.getAllByRole("button", { name: /sign in/i });
    const submitButton = buttons[buttons.length - 1];

    await act(() => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      if (form) {
        fireEvent.submit(form);
      }
    });

    await waitFor(
      () => {
        expect(submitButton).toHaveTextContent("Signing in...");
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      },
      { timeout: 1000 },
    );
  });

  it("renders navigation links", async () => {
    renderWithProviders(<Login />);

    // Wait for links to be rendered (they might be in a lazy-loaded component)
    // Use getAllByRole to handle multiple elements (test isolation)
    const registerLinks = await waitFor(
      () => {
        const links = screen.getAllByRole("link", { name: /create an account/i });
        if (links.length === 0) {
          throw new Error("Register link not found");
        }
        return links;
      },
      { timeout: 3000 },
    );
    const forgotLinks = await waitFor(
      () => {
        const links = screen.getAllByRole("link", { name: /forgot password/i });
        if (links.length === 0) {
          throw new Error("Forgot password link not found");
        }
        return links;
      },
      { timeout: 3000 },
    );

    // Get the last one (most recent)
    const registerLink = registerLinks[registerLinks.length - 1];
    const forgotLink = forgotLinks[forgotLinks.length - 1];

    expect(registerLink).toHaveAttribute("href", "/register");
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });
});
