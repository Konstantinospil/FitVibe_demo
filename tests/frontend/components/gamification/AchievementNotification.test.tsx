import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockSuccess = vi.fn();

vi.mock("../../src/contexts/ToastContext", () => ({
  useToast: () => ({
    success: mockSuccess,
  }),
}));

import { AchievementNotification } from "../../src/components/gamification/AchievementNotification";

describe("AchievementNotification", () => {
  beforeEach(() => {
    mockSuccess.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a toast and calls onDismiss when shown", () => {
    const onDismiss = vi.fn();
    render(
      <AchievementNotification
        badge={{
          code: "first",
          name: "First Win",
          description: "Nice!",
        }}
        onDismiss={onDismiss}
      />,
    );

    expect(mockSuccess).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does nothing when show is false", () => {
    const onDismiss = vi.fn();
    render(
      <AchievementNotification
        badge={{
          code: "first",
          name: "First Win",
          description: "Nice!",
        }}
        show={false}
        onDismiss={onDismiss}
      />,
    );

    expect(mockSuccess).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
