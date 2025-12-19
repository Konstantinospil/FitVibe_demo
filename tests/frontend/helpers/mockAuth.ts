import { vi } from "vitest";
import type { AuthStore } from "../../src/store/auth.store";

/**
 * Create a mock auth store state
 * This provides a consistent way to mock authentication state across tests
 */
export function createMockAuthStore(
  overrides: Partial<AuthStore> = {},
): AuthStore {
  return {
    isAuthenticated: true,
    user: {
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      role: "user",
      isVerified: true,
      createdAt: new Date().toISOString(),
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    ...overrides,
  };
}

/**
 * Create an unauthenticated mock auth store state
 */
export function createUnauthenticatedAuthStore(): AuthStore {
  return createMockAuthStore({
    isAuthenticated: false,
    user: null,
  });
}

