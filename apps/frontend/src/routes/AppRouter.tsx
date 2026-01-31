import React, { Suspense } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import * as AuthContext from "../contexts/AuthContext";
import { ErrorBoundary } from "../components/ErrorBoundary.js";
import PublicRoutes from "./PublicRoutes";
import Maintenance from "../pages/Maintenance";
import { useSystemConfig } from "../utils/featureFlags";
import { lazyWithRetry } from "../utils/lazyWithRetry";

const ProtectedRoutes = lazyWithRetry(() => import("./ProtectedRoutes"));

const loadingFallback = (
  <div
    className="flex h-screen w-full items-center justify-center text-primary-500"
    role="status"
    aria-live="polite"
  >
    Loading...
  </div>
);

type AuthHook = () => { isAuthenticated: boolean; isInitializing?: boolean };

const PUBLIC_PATHS = new Set([
  "/login",
  "/login/verify-2fa",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/cookie",
  "/impressum",
  "/contact",
]);

const useAuthOrFallback: AuthHook =
  typeof (AuthContext as { useAuth?: AuthHook }).useAuth === "function"
    ? (AuthContext as { useAuth: AuthHook }).useAuth
    : () => ({ isAuthenticated: false, isInitializing: false });

const RouterContent: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuthOrFallback();
  const location = useLocation();
  const isPublicPath = PUBLIC_PATHS.has(location.pathname);
  const { config } = useSystemConfig();

  // Wait for initialization to complete before deciding which routes to render
  if (isInitializing) {
    if (isPublicPath) {
      return <PublicRoutes />;
    }
    return (
      <div
        className="flex h-screen w-full items-center justify-center text-primary-500"
        role="status"
        aria-live="polite"
      >
        Loading...
      </div>
    );
  }

  if (config.maintenanceMode) {
    return <Maintenance message={config.maintenanceMessage} />;
  }

  return isAuthenticated ? <ProtectedRoutes /> : <PublicRoutes />;
};

const AppRouter: React.FC = () => (
  <ErrorBoundary>
    <AuthContext.AuthProvider>
      <BrowserRouter>
        <Suspense fallback={loadingFallback}>
          <RouterContent />
        </Suspense>
      </BrowserRouter>
    </AuthContext.AuthProvider>
  </ErrorBoundary>
);

export default AppRouter;
