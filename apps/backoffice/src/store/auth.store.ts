import { create } from "zustand";

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  role?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  signIn: (user) => {
    set({ isAuthenticated: true, user });
  },
  signOut: () => {
    set({ isAuthenticated: false, user: null });
  },
  updateUser: (user) => {
    set({ user });
  },
}));
