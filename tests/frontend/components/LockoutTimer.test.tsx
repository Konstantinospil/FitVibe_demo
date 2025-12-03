/**
 * Tests for LockoutTimer component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LockoutTimer } from "../../../apps/frontend/src/components/LockoutTimer";

describe("LockoutTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should display countdown timer in MM:SS format", () => {
    render(<LockoutTimer remainingSeconds={125} lockoutType="account" />);

    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("should update timer every second", async () => {
    render(<LockoutTimer remainingSeconds={125} lockoutType="account" />);

    expect(screen.getByText("02:05")).toBeInTheDocument();

    // Advance timers and wait for React to update
    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.getByText("02:04")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.getByText("02:03")).toBeInTheDocument();
  });

  it("should call onExpired when timer reaches zero", async () => {
    const onExpired = vi.fn();
    render(<LockoutTimer remainingSeconds={2} lockoutType="account" onExpired={onExpired} />);

    expect(screen.getByText("00:02")).toBeInTheDocument();

    // Advance by 1 second - timer should update to 00:01
    await vi.advanceTimersByTimeAsync(1000);
    await waitFor(
      () => {
        expect(screen.getByText("00:01")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Advance by another second - timer should reach 0 and call onExpired
    await vi.advanceTimersByTimeAsync(1000);
    await waitFor(
      () => {
        expect(onExpired).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000 },
    );
  });

  it("should not render when remainingSeconds is 0", () => {
    const { container } = render(<LockoutTimer remainingSeconds={0} lockoutType="account" />);
    expect(container.firstChild).toBeNull();
  });

  it("should display account lockout message", () => {
    render(<LockoutTimer remainingSeconds={60} lockoutType="account" />);
    expect(screen.getByText(/Account lockout/i)).toBeInTheDocument();
  });

  it("should display IP lockout message", () => {
    render(<LockoutTimer remainingSeconds={60} lockoutType="ip" />);
    expect(screen.getByText(/IP lockout/i)).toBeInTheDocument();
  });

  it("should be accessible with ARIA attributes", () => {
    render(<LockoutTimer remainingSeconds={60} lockoutType="account" />);

    const timerElement = screen.getByRole("status");
    expect(timerElement).toHaveAttribute("aria-live", "polite");
    expect(timerElement).toHaveAttribute("aria-atomic", "true");
  });

  it("should handle minutes correctly", () => {
    render(<LockoutTimer remainingSeconds={3661} lockoutType="account" />);
    expect(screen.getByText("61:01")).toBeInTheDocument();
  });

  it("should pad seconds with zero", () => {
    render(<LockoutTimer remainingSeconds={65} lockoutType="account" />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("should update when remainingSeconds prop changes", () => {
    const { rerender } = render(<LockoutTimer remainingSeconds={60} lockoutType="account" />);
    expect(screen.getByText("01:00")).toBeInTheDocument();

    rerender(<LockoutTimer remainingSeconds={30} lockoutType="account" />);
    // Component should update immediately when prop changes
    expect(screen.getByText("00:30")).toBeInTheDocument();
  });
});
