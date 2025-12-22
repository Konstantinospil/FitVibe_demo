import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import type { User } from "../store/auth.store";
import { useAuthStore } from "../store/auth.store";
import { getCurrentUser } from "../services/api";

/**
 * SECURITY FIX (CWE-922): Removed token exposure from context
 *
 * BEFORE: Exposed accessToken/refreshToken to all consuming components
 * AFTER: Only expose authentication state and user data
 *
 * Tokens are now in HttpOnly cookies (managed by backend + browser).
 * No client code needs direct access to tokens.
 */

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
  isInitializing?: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore authentication state on page load/refresh
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check if there's an auth flag in sessionStorage
        const authFlag =
          typeof window !== "undefined" && window.sessionStorage
            ? window.sessionStorage.getItem("fitvibe:auth")
            : null;

        // If auth flag exists, verify session with backend
        if (authFlag === "1") {
          try {
            // getCurrentUser will automatically trigger token refresh if needed via interceptor
            const userData = await getCurrentUser();
            // Session is valid, restore auth state
            signIn({
              id: userData.id,
              username: userData.username,
              email: userData.primaryEmail || "",
              role: userData.role,
            });
          } catch (error) {
            // Session is invalid or expired
            // The API interceptor may have already called signOut() if refresh failed
            // Check if the flag still exists (it might have been cleared by signOut)
            const stillHasFlag =
              typeof window !== "undefined" && window.sessionStorage
                ? window.sessionStorage.getItem("fitvibe:auth") === "1"
                : false;

            // Only clear the flag if it still exists (signOut might have already cleared it)
            if (stillHasFlag) {
              if (typeof window !== "undefined" && window.sessionStorage) {
                window.sessionStorage.removeItem("fitvibe:auth");
              }
            }
            // Don't call signOut() here as it would make an API call
            // The state is already false from initial state
            console.error("Session restoration failed:", error);
          }
        } else {
          // No auth flag - user is not authenticated
          // This is expected for users who haven't logged in
        }
        // If no auth flag, user is not authenticated - no need to check backend
      } catch (error) {
        // Error during restoration, but don't block app
        console.error("Error restoring session:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    void restoreSession();
  }, [signIn]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      signIn,
      signOut,
      updateUser,
      isInitializing,
    }),
    [isAuthenticated, user, signIn, signOut, updateUser, isInitializing],
  );

  // Show loading state while initializing to prevent premature redirects
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthProvider, useAuth };
