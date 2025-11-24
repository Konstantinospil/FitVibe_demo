import React from "react";
import { render, screen } from "@testing-library/react";
import App from "../src/App";

// Mock ToastProvider to avoid any potential hanging issues
vi.mock("../src/contexts/ToastContext", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock AppRouter to avoid loading routes and dependencies
vi.mock("../src/routes/AppRouter", () => ({
  default: () => <div data-testid="app-router">router-content</div>,
}));

describe("App", () => {
  it("renders the app with router wrapped in ToastProvider", () => {
    // Verify that App renders without error
    const { unmount } = render(<App />);

    expect(screen.getByTestId("app-router")).toBeInTheDocument();

    // Clean up to prevent hanging
    unmount();
  });
});
