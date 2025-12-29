// Always load React app for all routes - let React Router handle routing
// The static login shell in HTML is just a fallback for no-JS scenarios
// Session restoration is handled by AuthContext, so we don't check auth here
// This prevents premature redirects before React can restore the session
const pathname = typeof window !== "undefined" ? window.location.pathname : "";
const useLoginShell = pathname === "/login";

if (useLoginShell) {
  void import("./public/login-shell");
} else {
  void import("./main");
}

// Export to make this file a module for TypeScript
export {};
