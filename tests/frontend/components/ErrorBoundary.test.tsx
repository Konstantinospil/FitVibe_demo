import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";

// Mock i18next
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "components.errorBoundary.title": "Something went wrong",
    "components.errorBoundary.message": "An unexpected error occurred",
    "components.errorBoundary.tryAgain": "Try Again",
  };
  return translations[key] || key;
};

vi.mock("react-i18next", () => ({
  withTranslation: () => (Component: React.ComponentType<any>) => {
    return (props: any) => <Component {...props} t={mockT} i18n={{}} tReady={true} />;
  },
  useTranslation: () => ({
    t: mockT,
    i18n: {},
    ready: true,
  }),
}));

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>Normal Content</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress error console logs during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Child Component</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Child Component")).toBeInTheDocument();
  });

  it("should render error UI when child throws error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    const button = screen.getByText("Try again").closest("button");
    expect(button).toBeInTheDocument();
  });

  it("should render fallback UI when provided", () => {
    const fallback = <div>Custom Error Fallback</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom Error Fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("should call onError callback when error is caught", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test error" }),
      expect.any(Object),
    );
  });

  it("should reset error state when Try Again is clicked", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Initial error state - find button by text
    const tryAgainButton = screen.getByText("Try again").closest("button");
    expect(tryAgainButton).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // First, update the child to not throw anymore
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // Error UI should still be showing because error boundary caught the initial error
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Click Try Again to reset and render the (now non-throwing) child
    const tryAgainBtn = screen.getByText("Try again").closest("button");
    if (tryAgainBtn) {
      fireEvent.click(tryAgainBtn);
    }

    // Now the child should render normally
    expect(screen.getByText("Normal Content")).toBeInTheDocument();
  });

  it("should display default error message when error has no message", () => {
    const ThrowErrorWithoutMessage = () => {
      const error = new Error();
      error.message = "";
      throw error;
    };

    render(
      <ErrorBoundary>
        <ThrowErrorWithoutMessage />
      </ErrorBoundary>,
    );

    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });

  it("should apply correct styling to error container", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const errorContainer = screen.getByText("Test error").closest("div");
    expect(errorContainer).toHaveStyle({
      padding: "2rem",
      textAlign: "center",
    });
  });

  it("should not call onError when no error occurs", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <div>Normal Content</div>
      </ErrorBoundary>,
    );

    expect(onError).not.toHaveBeenCalled();
  });

  it("should render multiple children correctly", () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });
});
