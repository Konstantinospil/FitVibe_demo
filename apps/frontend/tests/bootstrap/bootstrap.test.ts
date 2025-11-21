import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mockLoginShellImport = vi.fn(async () => ({}));
const mockMainImport = vi.fn(async () => ({}));

vi.mock("../../src/public/login-shell", () => ({
  default: mockLoginShellImport,
}));

vi.mock("../../src/main", () => ({
  default: mockMainImport,
}));

const originalLocation = window.location;
const originalSessionStorage = window.sessionStorage;

const setWindowPath = (path: string) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...originalLocation,
      pathname: path,
      toString: () => path,
      replace: vi.fn(),
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
    mockLoginShellImport.mockClear();
    mockMainImport.mockClear();
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

    expect(window.location.replace).toHaveBeenCalledWith("/login");
    expect(mockLoginShellImport).not.toHaveBeenCalled();
    expect(mockMainImport).not.toHaveBeenCalled();
  });

  it("loads the login shell on the static public login route", async () => {
    setSessionFlag(undefined);
    setWindowPath("/login");

    await importBootstrap();

    expect(mockLoginShellImport).toHaveBeenCalled();
    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it("initializes the SPA and removes the shell when a session is active", async () => {
    setSessionFlag("1");
    setWindowPath("/dashboard");
    const shell = document.createElement("div");
    shell.id = "login-shell";
    document.body.appendChild(shell);

    await importBootstrap();

    expect(mockMainImport).toHaveBeenCalled();
    expect(document.getElementById("login-shell")).toBeNull();
    expect(window.location.replace).not.toHaveBeenCalled();
  });
});
