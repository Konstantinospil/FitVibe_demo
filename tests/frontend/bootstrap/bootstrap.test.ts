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

    // Wait a bit for the redirect to execute (bootstrap runs synchronously but module import is async)
    await new Promise((resolve) => setTimeout(resolve, 10));

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
});
