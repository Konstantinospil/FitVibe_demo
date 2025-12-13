import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
// i18n is imported but initialized asynchronously, so it doesn't block rendering
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

// Check if this is SSR hydration (root already has content) or client-only render
if (rootElement.hasChildNodes()) {
  // SSR: Hydrate the existing server-rendered content
  hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  // Fallback: Client-only render (for development or if SSR fails)
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
