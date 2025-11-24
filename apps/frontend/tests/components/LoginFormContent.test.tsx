import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginFormContent from "../../src/pages/LoginFormContent";
import * as api from "../../src/services/api";
import { useAuth } from "../../src/contexts/AuthContext";

const mockNavigate = vi.fn();
const mockSignIn = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: null,
    }),
  };
});

vi.mock("../../src/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../src/services/api", () => ({
  login: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.login.emailLabel": "Email",
        "auth.login.passwordLabel": "Password",
        "auth.login.showPassword": "Show password",
        "auth.login.hidePassword": "Hide password",
        "auth.login.submit": "Sign In",
        "auth.login.submitting": "Signing in...",
        "auth.login.registerPrompt": "Create account",
        "auth.login.forgot": "Forgot password?",
        "auth.login.error": "Login failed",
        "auth.placeholders.email": "Enter your email",
        "auth.placeholders.password": "Enter your password",
        "errors.INVALID_CREDENTIALS": "Invalid credentials",
      };
      return translations[key] || key;
    },
  }),
}));

describe("LoginFormContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      signIn: mockSignIn,
      signOut: vi.fn(),
      user: null,
      isAuthenticated: false,
      updateUser: vi.fn(),
    });
  });

  it("should render login form", () => {
    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("should show error when submitting empty form", async () => {
    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please fill in all fields")).toBeInTheDocument();
    });
  });

  it("should call login API on form submission", async () => {
    vi.mocked(api.login).mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@example.com" },
      requires2FA: false,
    });

    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("should navigate to 2FA page when 2FA is required", async () => {
    vi.mocked(api.login).mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@example.com" },
      requires2FA: true,
      pendingSessionId: "session-123",
    });

    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login/verify-2fa", {
        state: {
          pendingSessionId: "session-123",
          from: "/",
        },
      });
    });
  });

  it("should navigate to terms reacceptance when terms are outdated", async () => {
    vi.mocked(api.login).mockRejectedValue({
      response: {
        data: {
          error: {
            code: "TERMS_VERSION_OUTDATED",
            message: "Terms need to be reaccepted",
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/terms-reacceptance", { replace: true });
    });
  });

  it("should show error message on login failure", async () => {
    vi.mocked(api.login).mockRejectedValue({
      response: {
        data: {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("should toggle password visibility", () => {
    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText("Password");
    const toggleButton = screen.getByLabelText("Show password");

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByLabelText("Hide password")).toBeInTheDocument();
  });

  it("should render register and forgot password links", () => {
    render(
      <MemoryRouter>
        <LoginFormContent />
      </MemoryRouter>,
    );

    expect(screen.getByText("Create account")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });
});
