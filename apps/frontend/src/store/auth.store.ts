import { create } from "zustand";

/**
 * SECURITY FIX (CWE-922): Removed token storage from localStorage
 *
 * BEFORE: Tokens stored in localStorage via persist middleware → vulnerable to XSS
 * AFTER: Tokens only in HttpOnly cookies (set by backend) → immune to XSS
 *
 * The backend sets HttpOnly cookies on login/refresh, and axios sends them
 * automatically with withCredentials: true. No client-side token storage needed.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
}

const AUTH_STORAGE_KEY = "fitvibe:auth";

const setAuthFlag = (value: boolean) => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  if (value) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
  } else {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}

const initialState = {
  isAuthenticated: false,
  user: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...initialState,
  signIn: (user) => {
    setAuthFlag(true);
    set({
      isAuthenticated: true,
      user,
    });
  },
  signOut: () => {
    setAuthFlag(false);
    set({ ...initialState });
  },
  updateUser: (user) =>
    set((state) => ({
      ...state,
      user,
    })),
}));
