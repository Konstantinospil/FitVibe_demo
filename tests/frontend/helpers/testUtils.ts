import { screen, waitFor, type waitForOptions } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Utility to wait for an element to appear using findBy* queries
 * This is preferred over waitFor as it's more efficient and doesn't require polling
 *
 * @example
 * ```ts
 * const element = await waitForElement(() => screen.getByText("Hello"));
 * ```
 */
export async function waitForElement<T>(
  queryFn: () => T,
  options?: waitForOptions,
): Promise<T> {
  return waitFor(queryFn, {
    timeout: 2000, // Shorter default timeout to fail fast
    ...options,
  });
}

/**
 * Utility to wait for an element to disappear
 * Uses waitFor with a query that should return null
 *
 * @example
 * ```ts
 * await waitForElementToDisappear(() => screen.queryByText("Loading..."));
 * ```
 */
export async function waitForElementToDisappear(
  queryFn: () => HTMLElement | null,
  options?: waitForOptions,
): Promise<void> {
  await waitFor(
    () => {
      expect(queryFn()).not.toBeInTheDocument();
    },
    {
      timeout: 2000,
      ...options,
    },
  );
}

/**
 * Advances fake timers and waits for async operations to complete
 * Use this when you need to advance time in tests with fake timers
 *
 * @example
 * ```ts
 * // Advance by 1 second
 * await advanceTimersAndWait(1000);
 * ```
 */
export async function advanceTimersAndWait(ms: number = 0): Promise<void> {
  if (vi.isFakeTimers()) {
    vi.advanceTimersByTime(ms);
    // Wait for microtasks to complete
    await new Promise((resolve) => {
      if (typeof setImmediate !== "undefined") {
        setImmediate(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}

/**
 * Resolves all pending promises and timers
 * Use this at the end of tests to ensure everything completes
 *
 * @example
 * ```ts
 * it("does something", async () => {
 *   // ... test code ...
 *   await flushPromises();
 * });
 * ```
 */
export async function flushPromises(): Promise<void> {
  // Run all pending timers
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers();
  }

  // Wait for all microtasks to complete
  await new Promise((resolve) => {
    if (typeof setImmediate !== "undefined") {
      setImmediate(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Creates a controlled promise that can be resolved/rejected manually
 * Useful for testing loading states without hanging tests
 *
 * @example
 * ```ts
 * const { promise, resolve, reject } = createControlledPromise();
 * mockApi.getData.mockReturnValue(promise);
 *
 * // Test loading state
 * render(<Component />);
 * expect(screen.getByText("Loading...")).toBeInTheDocument();
 *
 * // Resolve to continue test
 * resolve(mockData);
 * await promise;
 * ```
 */
export function createControlledPromise<T = unknown>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (error: Error) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    promise,
    resolve: resolveFn,
    reject: rejectFn,
  };
}

