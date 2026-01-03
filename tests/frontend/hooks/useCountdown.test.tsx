import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useCountdown } from "../../src/hooks/useCountdown";

const CountdownTester = ({ initialSeconds }: { initialSeconds: number }) => {
  const [seconds, isActive, reset] = useCountdown(initialSeconds);

  return (
    <div>
      <div>Seconds: {seconds}</div>
      <div>Active: {isActive ? "yes" : "no"}</div>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <button type="button" onClick={() => reset(3)}>
        ResetToThree
      </button>
    </div>
  );
};

describe("useCountdown", () => {
  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.useRealTimers();
    }
  });

  it("counts down and stops at zero", () => {
    vi.useFakeTimers();
    render(<CountdownTester initialSeconds={2} />);

    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 2"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Active: yes"),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 1"),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 0"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Active: no"),
    ).toBeInTheDocument();
  });

  it("resets with new seconds and restarts", () => {
    vi.useFakeTimers();
    render(<CountdownTester initialSeconds={1} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 0"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Active: no"),
    ).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "ResetToThree" }).click();
    });
    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 3"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Active: yes"),
    ).toBeInTheDocument();
  });

  it("starts inactive when initial seconds is zero and can reset", () => {
    vi.useFakeTimers();
    render(<CountdownTester initialSeconds={0} />);

    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 0"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Active: no"),
    ).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "ResetToThree" }).click();
    });
    expect(
      screen.getByText((_, element) => element?.textContent === "Seconds: 3"),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "Active: yes"),
    ).toBeInTheDocument();
  });
});
