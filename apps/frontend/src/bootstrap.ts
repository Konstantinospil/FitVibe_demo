const pathname = typeof window !== "undefined" ? window.location.pathname : "";
const sessionFlag =
  typeof window !== "undefined" && window.sessionStorage
    ? window.sessionStorage.getItem("fitvibe:auth")
    : null;
const isAuthenticated = sessionFlag === "1";

const publicRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/cookie",
  "/terms-reacceptance",
]);

const isPublicRoute =
  publicRoutes.has(pathname) || pathname.startsWith("/login/") || pathname.startsWith("/public/");

if (!isAuthenticated && !isPublicRoute) {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
} else if (!isAuthenticated && pathname === "/login") {
  void import("./public/login-shell");
  void import("./main");
} else {
  const shell = typeof document !== "undefined" ? document.getElementById("login-shell") : null;
  if (shell) {
    shell.remove();
  }
  void import("./main");
}

// Export to make this file a module for TypeScript
export {};
