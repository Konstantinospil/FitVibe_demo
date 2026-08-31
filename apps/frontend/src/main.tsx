import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
// Suppress console errors in production for Lighthouse compliance
import "./utils/suppressConsole";
// i18n is imported - initialization is async via void promises, so it doesn't block rendering
// Components using translations will wait for i18n to be ready via useTranslation hook
import "./i18n/config";
// Theme store is small and needed immediately to prevent FOUC
import { useThemeStore } from "./store/theme.store";

// Static login shell removal is handled in bootstrap.ts with proper timing
// to ensure LCP uses the static HTML element

// Initialize theme on app load (SSR-safe)
// This is synchronous to prevent flash of unstyled content
if (typeof document !== "undefined") {
  const initialTheme = useThemeStore.getState().theme;
  document.documentElement.setAttribute("data-theme", initialTheme);
}

// Hydrate the server-rendered HTML
// Use hydrateRoot for SSR, which will match the server-rendered content
// SSR-safe: Only access document in browser
if (typeof document === "undefined") {
  throw new Error("Document is not available - this code should only run in the browser");
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The static #login-shell in index.html is a no-JS fallback, not SSR output.
// Hydrating the SPA over that markup never matches and leaves the fallback on screen.
const loginShell = document.getElementById("login-shell");
const hasSsrMarkup = rootElement.hasChildNodes() && !loginShell;

if (hasSsrMarkup) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
