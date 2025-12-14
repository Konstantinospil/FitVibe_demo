import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Use hoisted mocks to ensure they're set up before any imports
const mockToastProvider = vi.hoisted(() => {
  return ({ children }: { children: React.ReactNode }) => <>{children}</>;
});

const mockAppRouter = vi.hoisted(() => {
  return () => <div data-testid="app-router">router-content</div>;
});

// Mock ToastProvider BEFORE importing App to ensure mocks are in place
// This prevents the real ToastProvider from creating timers with setTimeout
vi.mock("../src/contexts/ToastContext", () => ({
  ToastProvider: mockToastProvider,
  useToast: () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock AppRouter BEFORE importing App to avoid loading routes and dependencies
// This prevents lazy loading and Suspense from causing async issues
vi.mock("../src/routes/AppRouter", () => ({
  default: mockAppRouter,
}));

// Import App after mocks are set up
import App from "../src/App";

describe("App", () => {
  beforeEach(() => {
    // Clear all timers before each test
    vi.clearAllTimers();
    // Use real timers to ensure setTimeout calls are tracked
    vi.useRealTimers();
  });

  afterEach(() => {
    // Clean up rendered components first
    cleanup();
    // Clear all timers to prevent hanging (catches any setTimeout from ToastProvider)
    vi.clearAllTimers();
    // Clear all mocks
    vi.clearAllMocks();
  });

  it("renders the app with router wrapped in ToastProvider", () => {
    // Verify that App renders without error
    const { unmount } = render(<App />);

    expect(screen.getByTestId("app-router")).toBeInTheDocument();

    // Clean up immediately to prevent hanging
    unmount();

    // Ensure all timers are cleared after unmount
    // This is critical because ToastProvider uses setTimeout
    vi.clearAllTimers();
  });
});
