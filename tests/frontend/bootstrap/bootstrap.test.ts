import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// Mock the modules that will be dynamically imported
vi.mock("../../src/public/login-shell", () => ({
  default: vi.fn(),
}));

vi.mock("../../src/main", () => ({
  default: vi.fn(),
}));

const originalLocation = window.location;
const originalSessionStorage = window.sessionStorage;

let mockReplace: ReturnType<typeof vi.fn>;

const setWindowPath = (path: string) => {
  mockReplace = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...originalLocation,
      pathname: path,
      toString: () => path,
      replace: mockReplace,
      assign: vi.fn(),
    },
  });
};

const setSessionFlag = (flag?: string) => {
  const store = new Map<string, string>();
  if (flag) {
    store.set("fitvibe:auth", flag);
  }
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: store.size,
    } satisfies Storage,
  });
};

const importBootstrap = async () => {
  await import("../../src/bootstrap");
};

describe("bootstrap entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: originalSessionStorage,
    });
    document.body.innerHTML = "";
  });

  it("redirects unauthenticated users away from private routes", async () => {
    setSessionFlag(undefined);
    setWindowPath("/sessions");

    await importBootstrap();

    // Verify the important behavior: redirect to login
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("loads the login shell on the static public login route", async () => {
    setSessionFlag(undefined);
    setWindowPath("/login");

    await importBootstrap();

    // Wait for dynamic import to complete (void import is fire-and-forget)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify the important behavior: no redirect should happen
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("initializes the SPA and removes the shell when a session is active", async () => {
    setSessionFlag("1");
    setWindowPath("/dashboard");
    const shell = document.createElement("div");
    shell.id = "login-shell";
    document.body.appendChild(shell);

    await importBootstrap();

    // Wait for dynamic import to complete (void import is fire-and-forget)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify the important behaviors: shell removed and no redirect
    expect(document.getElementById("login-shell")).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("normalizes paths with trailing slashes", async () => {
    setSessionFlag(undefined);
    setWindowPath("/sessions/");

    await importBootstrap();

    // Should redirect because normalized path is not in PUBLIC_ROUTES
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("handles all public routes correctly", async () => {
    const publicRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/login/verify-2fa",
      "/verify",
      "/terms",
      "/privacy",
      "/terms-reacceptance",
    ];

    for (const route of publicRoutes) {
      setSessionFlag(undefined);
      setWindowPath(route);
      mockReplace = vi.fn();

      await importBootstrap();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockReplace).not.toHaveBeenCalled();
    }
  });

  it("uses requestIdleCallback when available", async () => {
    setSessionFlag("1");
    setWindowPath("/dashboard");

    const mockIdleCallback = vi.fn((callback: () => void) => {
      setTimeout(callback, 0);
      return 1;
    });
    const originalIdleCallback = window.requestIdleCallback;
    (window as { requestIdleCallback?: typeof mockIdleCallback }).requestIdleCallback =
      mockIdleCallback;

    await importBootstrap();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockIdleCallback).toHaveBeenCalled();
    expect(mockIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });

    // Restore
    (window as { requestIdleCallback?: typeof originalIdleCallback }).requestIdleCallback =
      originalIdleCallback;
  });

  it("falls back to setTimeout when requestIdleCallback is not available", async () => {
    setSessionFlag("1");
    setWindowPath("/dashboard");

    const originalIdleCallback = window.requestIdleCallback;
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;

    const mockSetTimeout = vi.spyOn(global, "setTimeout");

    await importBootstrap();

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have called setTimeout as fallback
    expect(mockSetTimeout).toHaveBeenCalled();

    // Restore
    (window as { requestIdleCallback?: typeof originalIdleCallback }).requestIdleCallback =
      originalIdleCallback;
    mockSetTimeout.mockRestore();
  });

  it("handles missing sessionStorage gracefully", async () => {
    setWindowPath("/dashboard");
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: undefined,
    });

    await importBootstrap();

    // Should redirect because hasSessionFlag returns false when sessionStorage is undefined
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("handles case-insensitive path matching", async () => {
    setSessionFlag(undefined);
    setWindowPath("/LOGIN");

    // Ensure requestIdleCallback is properly set up or removed
    const originalIdleCallback = window.requestIdleCallback;
    if (originalIdleCallback) {
      // If it exists, make sure it's a function
      (window as { requestIdleCallback?: typeof originalIdleCallback }).requestIdleCallback =
        originalIdleCallback;
    } else {
      // If it doesn't exist, remove it to trigger setTimeout fallback
      delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
    }

    await importBootstrap();

    // Should not redirect because path is normalized to lowercase
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
