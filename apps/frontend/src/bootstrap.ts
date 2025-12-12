const PUBLIC_ROUTES = new Set<string>([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/login/verify-2fa",
  "/verify",
  "/terms",
  "/privacy",
  "/terms-reacceptance",
]);
const AUTH_STORAGE_KEY = "fitvibe:auth";

// SSR-safe: This script only runs in the browser (loaded from index.html)
// But add guards to prevent errors if somehow imported on server
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const normalizePath = (path: string) => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
};

const currentPath = normalizePath(window.location.pathname.toLowerCase());

const removeLoginShell = () => {
  const shell = document.getElementById("login-shell");
  if (shell) {
    shell.remove();
  }
};

const hasSessionFlag = (() => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }
  return window.sessionStorage.getItem(AUTH_STORAGE_KEY) === "1";
})();

// Always load React app for all routes - let React Router handle routing
// The static login shell in HTML is just a fallback for no-JS scenarios
if (!hasSessionFlag && !PUBLIC_ROUTES.has(currentPath)) {
  // Redirect to login if not authenticated and not on a public route
  window.location.replace("/login");
} else {
  // Defer font loading to after LCP - use requestIdleCallback for non-blocking load
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        void import("./utils/fontLoader").then(({ loadFontsAsync }) => {
          loadFontsAsync();
        });
      },
      { timeout: 3000 },
    );
  } else {
    // Fallback: delay font loading to ensure LCP has occurred
    setTimeout(() => {
      void import("./utils/fontLoader").then(({ loadFontsAsync }) => {
        loadFontsAsync();
      });
    }, 2000);
  }
  // Load main app - this is the critical path
  // Remove static login shell AFTER React has mounted to ensure LCP uses static HTML
  void import("./main").then(() => {
    // Use requestAnimationFrame to ensure React has rendered before removing shell
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        removeLoginShell();
      });
    });
  });
}
}

// Export to make this file a module for TypeScript
export {};
