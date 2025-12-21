import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../../src/store/auth.store";
import type { User } from "../../src/store/auth.store";

describe("auth store", () => {
  const mockUser: User = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    role: "athlete",
  };

  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
    });
  });

  describe("signIn", () => {
    it("should set user and mark as authenticated", () => {
      const { signIn } = useAuthStore.getState();

      signIn(mockUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });

    it("should update user data on subsequent signIn", () => {
      const { signIn } = useAuthStore.getState();

      signIn(mockUser);

      const updatedUser: User = {
        ...mockUser,
        username: "updateduser",
      };

      signIn(updatedUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(updatedUser);
      expect(state.user?.username).toBe("updateduser");
    });
  });

  describe("signOut", () => {
    it("should clear user and authentication state", async () => {
      const { signIn, signOut } = useAuthStore.getState();

      // First sign in
      signIn(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then sign out
      await signOut();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it("should be safe to call signOut when not authenticated", async () => {
      const { signOut } = useAuthStore.getState();

      await expect(signOut()).resolves.not.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("should update user data while maintaining authentication state", () => {
      const { signIn, updateUser } = useAuthStore.getState();

      signIn(mockUser);

      const updatedUser: User = {
        ...mockUser,
        username: "newusername",
        email: "newemail@example.com",
      };

      updateUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(updatedUser);
      expect(state.user?.username).toBe("newusername");
      expect(state.user?.email).toBe("newemail@example.com");
    });

    it("should allow partial user updates", () => {
      const { signIn, updateUser } = useAuthStore.getState();

      signIn(mockUser);

      const partialUpdate: User = {
        ...mockUser,
        username: "partialupdateuser",
      };

      updateUser(partialUpdate);

      const state = useAuthStore.getState();
      expect(state.user?.username).toBe("partialupdateuser");
      expect(state.user?.email).toBe(mockUser.email);
      expect(state.user?.id).toBe(mockUser.id);
    });
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it("should have signIn, signOut, and updateUser methods", () => {
      const state = useAuthStore.getState();

      expect(typeof state.signIn).toBe("function");
      expect(typeof state.signOut).toBe("function");
      expect(typeof state.updateUser).toBe("function");
    });
  });

  describe("authentication state", () => {
    it("should properly track authentication state", async () => {
      const { signIn, signOut } = useAuthStore.getState();

      // Initially not authenticated
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Sign in
      signIn(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Sign out
      await signOut();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("should maintain user data consistency with authentication state", async () => {
      const { signIn, signOut } = useAuthStore.getState();

      signIn(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);

      await signOut();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
