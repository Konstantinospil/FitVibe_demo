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

const shouldSuppress = (env?: { PROD?: boolean }) => {
  try {
    const metaEnv = env ?? import.meta?.env;
    return Boolean(metaEnv?.PROD);
  } catch {
    return false;
  }
};

type SuppressConsoleOptions = {
  windowRef?: Window;
  isProd?: boolean;
};

const initializeSuppressConsole = (options: SuppressConsoleOptions = {}) => {
  const windowRef = options.windowRef ?? (typeof window !== "undefined" ? window : undefined);
  const isProd = options.isProd ?? shouldSuppress();

  if (windowRef && isProd) {
    suppressConsole();
    if (typeof windowRef.addEventListener === "function") {
      windowRef.addEventListener("beforeunload", () => {
        restoreConsole();
      });
    }
  }
};

initializeSuppressConsole();

export { initializeSuppressConsole, restoreConsole, shouldSuppress, suppressConsole };
