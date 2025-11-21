/**
 * Schedules a callback to run when the browser has idle time, with a setTimeout fallback.
 * Returns a cancel function so pending work can be aborted when the component unmounts.
 */
type IdleDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

export const scheduleIdleTask = (
  callback: () => void,
  options?: {
    timeout?: number;
  },
) => {
  const timeout = options?.timeout ?? 1200;

  if (typeof window === "undefined") {
    const timeoutId = setTimeout(callback, timeout);
    return {
      cancel: () => clearTimeout(timeoutId),
    };
  }

  const win = window as typeof window & {
    requestIdleCallback?: (cb: IdleCallback, opts?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(
      () => {
        callback();
      },
      { timeout },
    );
    return {
      cancel: () => {
        if (typeof win.cancelIdleCallback === "function") {
          win.cancelIdleCallback(handle);
        }
      },
    };
  }

  const timeoutId = window.setTimeout(callback, Math.min(timeout, 200));
  return {
    cancel: () => window.clearTimeout(timeoutId),
  };
};
