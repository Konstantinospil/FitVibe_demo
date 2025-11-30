import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../../src/contexts/AuthContext";
import { useAuthStore } from "../../src/store/auth.store";

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

describe("AuthContext", () => {
  const mockUser = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    role: "user",
  };

  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  const mockUpdateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("should provide auth context values", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        isAuthenticated: true,
        user: mockUser,
        signIn: mockSignIn,
        signOut: mockSignOut,
        updateUser: mockUpdateUser,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.signIn).toBe(mockSignIn);
    expect(result.current.signOut).toBe(mockSignOut);
    expect(result.current.updateUser).toBe(mockUpdateUser);
  });

  it("should provide unauthenticated state", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        isAuthenticated: false,
        user: null,
        signIn: mockSignIn,
        signOut: mockSignOut,
        updateUser: mockUpdateUser,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should throw error when used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });

  it("should call signIn when signIn is invoked", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        isAuthenticated: false,
        user: null,
        signIn: mockSignIn,
        signOut: mockSignOut,
        updateUser: mockUpdateUser,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.signIn(mockUser);
    });

    expect(mockSignIn).toHaveBeenCalledWith(mockUser);
  });

  it("should call signOut when signOut is invoked", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        isAuthenticated: true,
        user: mockUser,
        signIn: mockSignIn,
        signOut: mockSignOut,
        updateUser: mockUpdateUser,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("should call updateUser when updateUser is invoked", () => {
    const updatedUser = { ...mockUser, username: "updateduser" };

    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        isAuthenticated: true,
        user: mockUser,
        signIn: mockSignIn,
        signOut: mockSignOut,
        updateUser: mockUpdateUser,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.updateUser(updatedUser);
    });

    expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
  });
});
