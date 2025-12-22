import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./i18n/config";

// Initialize theme early to prevent flash, but defer store import
// This allows the theme to be set without loading the full Zustand store initially
const initializeTheme = () => {
  try {
    const stored = localStorage.getItem("fitvibe:theme");
    if (stored) {
      const themeData = JSON.parse(stored) as { state?: { theme?: string } } | null;
      if (themeData?.state?.theme && typeof themeData.state.theme === "string") {
        document.documentElement.setAttribute("data-theme", themeData.state.theme);
        return;
      }
    }
  } catch {
    // Ignore parse errors
  }
  // Fallback to system preference
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  document.documentElement.setAttribute("data-theme", prefersLight ? "light" : "dark");
};

// Set theme immediately to prevent flash
initializeTheme();

// Handle static login shell transition to React (Priority 1: Opacity transition)
// The shell provides instant visual content during JS load (LCP optimization)
// Use opacity fade-out instead of DOM removal to prevent layout shift (CLS)
const root = document.getElementById("root");
const loginShell = document.getElementById("login-shell");

if (root) {
  // Defer React rendering slightly to allow browser to yield to other tasks
  // This reduces TBT on slower devices (like CI runners) by breaking up initial work
  // Use requestIdleCallback with short timeout to minimize delay while still yielding
  const renderApp = () => {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    // Fade out login shell after React has rendered (Priority 1: prevent CLS)
    // Using opacity transition instead of immediate removal prevents layout shift
    if (loginShell) {
      setTimeout(() => {
        const shell = loginShell;
        // Fade out smoothly
        shell.style.opacity = "0";
        shell.style.transition = "opacity 150ms ease";
        shell.style.pointerEvents = "none";

        // Remove from DOM after transition completes
        setTimeout(() => {
          if (shell.parentNode) {
            shell.remove();
          }
        }, 200);
      }, 0);
    }
  };

  // Use requestIdleCallback to defer rendering slightly, reducing main thread blocking
  if (typeof window !== "undefined" && window.requestIdleCallback) {
    window.requestIdleCallback(renderApp, { timeout: 50 });
  } else {
    // Fallback: use setTimeout(0) to defer to next tick
    setTimeout(renderApp, 0);
  }
}
