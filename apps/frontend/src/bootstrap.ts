const STATIC_PUBLIC_ROUTES = new Set<string>(["/login"]);
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

if (!hasSessionFlag && !PUBLIC_ROUTES.has(currentPath)) {
  window.location.replace("/login");
} else if (STATIC_PUBLIC_ROUTES.has(currentPath) || !hasSessionFlag) {
  void import("./public/login-shell");
} else {
  removeLoginShell();
  void import("./main");
}

// Export to make this file a module for TypeScript
export {};
