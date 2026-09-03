import { render, screen, waitFor } from "@testing-library/react";
import { Component, Suspense, type ComponentType, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { lazyWithRetry } from "../../src/utils/lazyWithRetry";

function Loaded() {
  return <div>loaded</div>;
}

class TestErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <div>failed</div> : this.props.children;
  }
}

describe("lazyWithRetry", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("loads a component on the first successful import", async () => {
    const Lazy = lazyWithRetry(() => Promise.resolve({ default: Loaded }));

    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>,
    );

    expect(await screen.findByText("loaded")).toBeInTheDocument();
  });

  it("retries a chunk load failure once and then succeeds", async () => {
    const importFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce({ default: Loaded });

    const Lazy = lazyWithRetry(importFn as () => Promise<{ default: ComponentType<object> }>);

    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>,
    );

    expect(await screen.findByText("loaded")).toBeInTheDocument();
    expect(importFn).toHaveBeenCalledTimes(2);
  });

  it("reloads the page after exhausting chunk-load retries", async () => {
    const error = new Error("Importing a module script failed");
    const importFn = vi.fn().mockRejectedValue(error);
    const Lazy = lazyWithRetry(importFn as () => Promise<{ default: ComponentType<object> }>, 0);

    render(
      <TestErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Lazy />
        </Suspense>
      </TestErrorBoundary>,
    );

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled();
    });
    expect(await screen.findByText("failed")).toBeInTheDocument();
  });

  it("rethrows non-chunk errors without reloading", async () => {
    const importFn = vi.fn().mockRejectedValue(new Error("syntax error"));
    const Lazy = lazyWithRetry(importFn as () => Promise<{ default: ComponentType<object> }>);

    render(
      <TestErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Lazy />
        </Suspense>
      </TestErrorBoundary>,
    );

    expect(await screen.findByText("failed")).toBeInTheDocument();
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
