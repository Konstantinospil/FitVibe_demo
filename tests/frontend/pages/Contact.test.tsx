import React from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Contact from "../../src/pages/Contact";
import { rawHttpClient } from "../../src/services/api";
import { useAuthStore } from "../../src/store/auth.store";

const mockNavigate = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  showToast: vi.fn(),
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/contexts/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    rawHttpClient: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

vi.mock("../../src/hooks/useRequiredFieldValidation", () => ({
  useRequiredFieldValidation: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "contact.eyebrow": "Contact",
        "contact.title": "Contact Us",
        "contact.description": "Get in touch with the FitVibe team.",
        "contact.form.emailLabel": "Email",
        "contact.form.topicLabel": "Topic",
        "contact.form.messageLabel": "Message",
        "contact.form.submit": "Send Message",
        "contact.form.submitting": "Sending...",
        "contact.form.emailRequired": "Email is required",
        "contact.form.topicRequired": "Topic is required",
        "contact.form.messageRequired": "Message is required",
        "contact.form.invalidEmail": "Please enter a valid email address",
        "contact.form.success": "Your message has been sent successfully!",
        "contact.form.error": "Failed to send message. Please try again.",
        "contact.form.networkError":
          "Cannot connect to server. Please check your connection and try again.",
        "contact.form.csrfError": "Security token error. Please refresh the page and try again.",
        "contact.form.characters": "characters",
        "navigation.home": "Home",
        "auth.login.title": "Login",
      };
      return translations[key] || options?.defaultValue || key;
    },
  }),
}));

describe("Contact page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rawHttpClient.get).mockResolvedValue({
      data: { csrfToken: "test-csrf-token" },
    } as any);
    vi.mocked(useAuthStore).mockImplementation((selector: any) =>
      selector({
        isAuthenticated: false,
        user: null,
      }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("should render contact form", () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    expect(screen.getByText("Contact Us")).toBeInTheDocument();
    expect(screen.getByText("Get in touch with the FitVibe team.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    const { container } = render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();

    // Submit form directly to bypass HTML5 validation
    fireEvent.submit(form!);

    await waitFor(
      () => {
        const error = screen.queryByText("Email is required");
        expect(error).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should show character count for message", () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    const messageInput = screen.getByLabelText("Message");
    fireEvent.change(messageInput, { target: { value: "Test message" } });

    expect(screen.getByText(/12 \/ 5000/)).toBeInTheDocument();
  });
});
