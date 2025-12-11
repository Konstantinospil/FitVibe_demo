import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "../../src/contexts/ToastContext";

const TestComponent: React.FC = () => {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success("Success message")}>Show Success</button>
      <button onClick={() => toast.error("Error message")}>Show Error</button>
      <button onClick={() => toast.warning("Warning message")}>Show Warning</button>
      <button onClick={() => toast.info("Info message")}>Show Info</button>
      <button onClick={() => toast.showToast("success", "Custom message", 1000)}>
        Show Custom
      </button>
    </div>
  );
};

describe("ToastContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show success toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText("Show Success");
    fireEvent.click(button);

    expect(screen.getByText("Success message")).toBeInTheDocument();
  });

  it("should show error toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText("Show Error");
    fireEvent.click(button);

    expect(screen.getByText("Error message")).toBeInTheDocument();
  });

  it("should show warning toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText("Show Warning");
    fireEvent.click(button);

    expect(screen.getByText("Warning message")).toBeInTheDocument();
  });

  it("should show info toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText("Show Info");
    fireEvent.click(button);

    expect(screen.getByText("Info message")).toBeInTheDocument();
  });

  it("should remove toast after duration", async () => {
    // Use real timers for this test since it's testing timeout behavior
    vi.useRealTimers();

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText("Show Custom");
    fireEvent.click(button);

    expect(screen.getByText("Custom message")).toBeInTheDocument();

    // Wait for the toast to be removed after duration (1000ms) + buffer
    await waitFor(
      () => {
        expect(screen.queryByText("Custom message")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Restore fake timers for other tests
    vi.useFakeTimers();
  });

  it("should allow manual toast removal", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    const button = screen.getByText("Show Success");
    fireEvent.click(button);

    expect(screen.getByText("Success message")).toBeInTheDocument();

    const closeButton = screen.getByLabelText("Close notification");
    fireEvent.click(closeButton);

    expect(screen.queryByText("Success message")).not.toBeInTheDocument();
  });

  it("should show multiple toasts", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Show Success"));
    fireEvent.click(screen.getByText("Show Error"));
    fireEvent.click(screen.getByText("Show Warning"));

    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByText("Error message")).toBeInTheDocument();
    expect(screen.getByText("Warning message")).toBeInTheDocument();
  });

  it("should throw error when useToast is used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useToast must be used within ToastProvider");

    consoleError.mockRestore();
  });
});
