import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import type { i18n } from "i18next";
import { ToastProvider } from "../../src/contexts/ToastContext";
import { createTestQueryClient } from "./testQueryClient";
import { getTestI18n } from "./testI18n";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  queryClient?: QueryClient;
  i18n?: i18n;
  withRouter?: boolean;
  withToast?: boolean;
}

/**
 * Render a component with all common providers (Router, QueryClient, i18n, Toast)
 * This is a shared utility to reduce boilerplate across test files
 *
 * @example
 * ```tsx
 * const { container } = renderWithProviders(<MyComponent />);
 * ```
 *
 * @example
 * ```tsx
 * const { container } = renderWithProviders(<MyComponent />, {
 *   initialEntries: ["/some/path"],
 *   withToast: true,
 * });
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const {
    initialEntries,
    queryClient = createTestQueryClient(),
    i18n = getTestI18n(),
    withRouter = true,
    withToast = false,
    ...renderOptions
  } = options;

  const Router = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    let content: React.ReactNode = children;

    // Wrap with ToastProvider if needed
    if (withToast) {
      content = <ToastProvider>{content}</ToastProvider>;
    }

    // Wrap with Router and i18n
    if (withRouter) {
      content = (
        <Router {...routerProps}>
          <I18nextProvider i18n={i18n}>{content}</I18nextProvider>
        </Router>
      );
    } else {
      content = <I18nextProvider i18n={i18n}>{content}</I18nextProvider>;
    }

    // Wrap with QueryClientProvider
    return (
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

