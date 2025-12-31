const noop = () => {};

const consoleRef = typeof globalThis !== "undefined" ? globalThis.console : undefined;

const getConsoleMethod = (key: "error" | "warn") => {
  if (!consoleRef) {
    return undefined;
  }
  const method = key === "error" ? consoleRef.error : consoleRef.warn;
  return typeof method === "function" ? method.bind(consoleRef) : undefined;
};

const originalError = getConsoleMethod("error");
const originalWarn = getConsoleMethod("warn");

const suppressConsole = () => {
  if (!consoleRef) {
    return;
  }
  if (typeof consoleRef.error === "function") {
    consoleRef.error = noop;
  }
  if (typeof consoleRef.warn === "function") {
    consoleRef.warn = noop;
  }
};

const restoreConsole = () => {
  if (!consoleRef) {
    return;
  }
  if (originalError) {
    consoleRef.error = originalError;
  }
  if (originalWarn) {
    consoleRef.warn = originalWarn;
  }
};

const shouldSuppress = () => {
  try {
    return Boolean(import.meta?.env?.PROD);
  } catch {
    return false;
  }
};

if (typeof window !== "undefined" && shouldSuppress()) {
  suppressConsole();
  if (typeof window.addEventListener === "function") {
    window.addEventListener("beforeunload", () => {
      restoreConsole();
    });
  }
}

export {};
