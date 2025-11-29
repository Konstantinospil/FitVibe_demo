import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthStore, type User } from "../../src/store/auth.store";

describe("auth.store", () => {
  const mockUser: User = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    role: "user",
  };

  beforeEach(() => {
    // Clear sessionStorage
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
    // Reset store to initial state
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.signOut();
    });
  });

  afterEach(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  it("should initialize with unauthenticated state", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should sign in user and set authenticated state", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.signIn(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("should set auth flag in sessionStorage on sign in", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.signIn(mockUser);
    });

    expect(window.sessionStorage.getItem("fitvibe:auth")).toBe("1");
  });

  it("should sign out user and reset state", () => {
    const { result } = renderHook(() => useAuthStore());

    // First sign in
    act(() => {
      result.current.signIn(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then sign out
    act(() => {
      result.current.signOut();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should remove auth flag from sessionStorage on sign out", () => {
    const { result } = renderHook(() => useAuthStore());

    // First sign in
    act(() => {
      result.current.signIn(mockUser);
    });

    expect(window.sessionStorage.getItem("fitvibe:auth")).toBe("1");

    // Then sign out
    act(() => {
      result.current.signOut();
    });

    expect(window.sessionStorage.getItem("fitvibe:auth")).toBeNull();
  });

  it("should update user information", () => {
    const { result } = renderHook(() => useAuthStore());

    // First sign in
    act(() => {
      result.current.signIn(mockUser);
    });

    const updatedUser: User = {
      ...mockUser,
      username: "updateduser",
      email: "updated@example.com",
    };

    act(() => {
      result.current.updateUser(updatedUser);
    });

    expect(result.current.user).toEqual(updatedUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should handle sign in with user that has role", () => {
    const adminUser: User = {
      id: "admin-1",
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    };

    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.signIn(adminUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(adminUser);
    expect(result.current.user?.role).toBe("admin");
  });

  it("should handle updateUser when not authenticated", () => {
    const { result } = renderHook(() => useAuthStore());

    // Try to update user when not authenticated
    act(() => {
      result.current.updateUser(mockUser);
    });

    // User should be set, but isAuthenticated should remain false
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should handle sign in and sign out multiple times", () => {
    const { result } = renderHook(() => useAuthStore());

    // Sign in
    act(() => {
      result.current.signIn(mockUser);
    });
    expect(result.current.isAuthenticated).toBe(true);

    // Sign out
    act(() => {
      result.current.signOut();
    });
    expect(result.current.isAuthenticated).toBe(false);

    // Sign in again
    act(() => {
      result.current.signIn(mockUser);
    });
    expect(result.current.isAuthenticated).toBe(true);
  });
});
