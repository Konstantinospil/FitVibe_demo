import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type * as RouterDomModule from "react-router-dom";

const baseTranslations: Record<string, string | string[]> = {
  "cookie.title": "Cookie Policy",
  "cookie.eyebrow": "Cookie Policy",
  "cookie.policy.title": "Cookie Policy",
  "cookie.policy.description": "How we use cookies",
  "cookie.effectiveDate": "Effective Date",
  "cookie.effectiveDateValue": "2024-06-01",
  "cookie.section1.title": "1. What are cookies?",
  "cookie.section1.content": "Cookies are small text files...",
  "cookie.section2.title": "2. Types of cookies",
  "cookie.section2.items": ["Essential cookies", "Functional cookies"],
  "cookie.section3.title": "3. How we use cookies",
  "cookie.section3.content": "We use cookies to...",
  "cookie.section4.title": "4. Managing cookies",
  "cookie.section4.items": ["Browser settings", "Cookie preferences"],
  "cookie.section5.title": "5. Third-party cookies",
  "cookie.section5.content": "Some cookies are set by...",
  "cookie.section6.title": "6. Updates to this policy",
  "cookie.section6.content": "We may update this policy...",
  "cookie.section7.title": "7. Contact us",
  "cookie.section7.content": "For questions about cookies...",
  "cookie.revokeConsent": "Revoke Consent",
  "cookie.revokeConfirm.title": "Revoke cookie consent?",
  "cookie.revokeConfirm.message": "This will log you out.",
  "cookie.revokeConfirm.confirm": "Confirm",
  "cookie.revokeConfirm.cancel": "Cancel",
  "navigation.home": "Home",
  "auth.login.title": "Login",
  "common.loading": "Loading...",
};

type BuildOptions = {
  translations?: Record<string, string | string[]>;
  translationsLoadingPromise?: Promise<void>;
  i18nTImpl?: (key: string) => string;
  authState?: {
    isAuthenticated?: boolean;
    signOut?: () => unknown;
    user?: unknown;
  };
  revokeTermsImpl?: () => Promise<unknown>;
  getLegalDocumentVersionsImpl?: () => Promise<unknown>;
};

const buildCookie = async (options: BuildOptions = {}) => {
  vi.resetModules();

  const translations = { ...baseTranslations, ...options.translations };
  const i18nTImpl = options.i18nTImpl ?? ((key: string) => translations[key] || key);
  const i18nMock = { t: vi.fn(i18nTImpl) };
  const translationsLoadingPromise = options.translationsLoadingPromise ?? Promise.resolve();

  const authState = {
    isAuthenticated: false,
    user: null,
    signOut: vi.fn(),
    ...options.authState,
  };

  const mockNavigate = vi.fn();
  const revokeTerms = vi.fn(options.revokeTermsImpl ?? (() => Promise.resolve()));
  const getLegalDocumentVersions = vi.fn(
    options.getLegalDocumentVersionsImpl ?? (() => Promise.resolve(null)),
  );

  vi.doMock("../../src/i18n/config", () => ({
    default: i18nMock,
    translationsLoadingPromise,
  }));

  vi.doMock("react-i18next", () => ({
    useTranslation: () => ({
      t: (
        key: string,
        options?: { returnObjects?: boolean; defaultValue?: string },
      ): string | string[] | Record<string, unknown> => {
        const value = translations[key];
        if (options?.returnObjects) {
          if (Array.isArray(value)) {
            return value;
          }
          if (value && typeof value === "object") {
            return value;
          }
        }
        if (typeof value === "string") {
          return value;
        }
        if (options?.defaultValue) {
          return options.defaultValue;
        }
        return key;
      },
    }),
  }));

  vi.doMock("../../src/store/auth.store", () => ({
    useAuthStore: vi.fn((selector) => selector(authState)),
  }));

  vi.doMock("../../src/services/api", () => ({
    revokeTerms,
    getLegalDocumentVersions,
  }));

  vi.doMock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof RouterDomModule>("react-router-dom");
    return {
      ...actual,
      useNavigate: () => mockNavigate,
    };
  });

  const module = await import("../../src/pages/Cookie");
  const { ToastProvider } = await import("../../src/contexts/ToastContext");

  return {
    Cookie: module.default,
    ToastProvider,
    authState,
    mockNavigate,
    revokeTerms,
    getLegalDocumentVersions,
    i18nMock,
  };
};

describe("Cookie page", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("shows loading state while translations are pending", async () => {
    const { Cookie, ToastProvider } = await buildCookie({
      translationsLoadingPromise: new Promise(() => {}),
      i18nTImpl: () => "cookie.title",
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
  });

  it("renders after polling when translations become available", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const { Cookie, ToastProvider } = await buildCookie({
      i18nTImpl: (key) => {
        if (key === "cookie.title") {
          calls += 1;
          return calls < 2 ? "cookie.title" : "Cookie Policy";
        }
        return baseTranslations[key] || key;
      },
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    await vi.advanceTimersByTimeAsync(100);
    await vi.runOnlyPendingTimersAsync();

    expect(screen.getAllByText("Cookie Policy").length).toBeGreaterThan(0);
  });

  it("renders after polling timeout when translations never load", async () => {
    vi.useFakeTimers();
    const { Cookie, ToastProvider } = await buildCookie({
      i18nTImpl: () => "cookie.title",
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    await vi.advanceTimersByTimeAsync(2000);
    await vi.runOnlyPendingTimersAsync();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders effective date from API", async () => {
    const { Cookie, ToastProvider } = await buildCookie({
      getLegalDocumentVersionsImpl: () => Promise.resolve({ cookie: "2024-07-01" }),
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("2024-07-01")).toBeInTheDocument();
    });
  });

  it("falls back to translation date when API fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { Cookie, ToastProvider } = await buildCookie({
      getLegalDocumentVersionsImpl: () => Promise.reject(new Error("fail")),
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("2024-06-01")).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it("filters array translations and ignores non-arrays", async () => {
    const { Cookie, ToastProvider } = await buildCookie({
      translations: {
        "cookie.section2.items": ["Essential cookies", 123, "Functional cookies"],
        "cookie.section4.items": "not-array",
      },
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("2. Types of cookies")).toBeInTheDocument();
    });

    expect(screen.getByText("Essential cookies")).toBeInTheDocument();
    expect(screen.getByText("Functional cookies")).toBeInTheDocument();
    expect(screen.queryByText("123")).not.toBeInTheDocument();
    expect(screen.queryByText("Browser settings")).not.toBeInTheDocument();
  });

  it("navigates to login when unauthenticated", async () => {
    const { Cookie, ToastProvider, mockNavigate } = await buildCookie();

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    const button = await screen.findByRole("button", { name: "Login" });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("navigates home when authenticated and revokes consent on success", async () => {
    const signOut = vi.fn();
    const { Cookie, ToastProvider, mockNavigate, revokeTerms } = await buildCookie({
      authState: { isAuthenticated: true, signOut },
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    const homeButton = await screen.findByRole("button", { name: "Home" });
    fireEvent.click(homeButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");

    const revokeButton = screen.getByRole("button", { name: "Revoke Consent" });
    fireEvent.click(revokeButton);

    const confirmButton = await screen.findByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(revokeTerms).toHaveBeenCalled();
    });

    expect(signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("closes revoke dialog when revocation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const revokeTerms = vi.fn().mockRejectedValue(new Error("nope"));
    const signOut = vi.fn();
    const { Cookie, ToastProvider, mockNavigate } = await buildCookie({
      authState: { isAuthenticated: true, signOut },
      revokeTermsImpl: revokeTerms,
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Cookie />
        </MemoryRouter>
      </ToastProvider>,
    );

    const revokeButton = await screen.findByRole("button", { name: "Revoke Consent" });
    fireEvent.click(revokeButton);

    const confirmButton = await screen.findByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(revokeTerms).toHaveBeenCalled();
    });

    expect(signOut).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith("/login", { replace: true });
    expect(screen.queryByText("Revoke cookie consent?")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
