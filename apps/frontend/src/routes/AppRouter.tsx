import React, { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";
import * as AuthContext from "../contexts/AuthContext";
import { ErrorBoundary } from "../components/ErrorBoundary.js";
import PublicRoutes from "./PublicRoutes";
const ProtectedRoutes = lazy(() => import("./ProtectedRoutes"));

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

const useAuthOrFallback: AuthHook =
  typeof (AuthContext as { useAuth?: AuthHook }).useAuth === "function"
    ? (AuthContext as { useAuth: AuthHook }).useAuth
    : () => ({ isAuthenticated: false, isInitializing: false });

const RouterContent: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuthOrFallback();

  // Wait for initialization to complete before deciding which routes to render
  if (isInitializing) {
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
