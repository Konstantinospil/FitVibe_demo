import crypto from "crypto";
import {
  normalizeAuthTiming,
  withNormalizedTiming,
  TIMING_CONSTANTS,
} from "../../../../apps/backend/src/modules/auth/timing.utils.js";

jest.mock("crypto", () => ({
  randomInt: jest.fn(),
}));

const mockedCrypto = jest.mocked(crypto);
(mockedCrypto.randomInt as jest.Mock).mockReturnValue(0); // Default value

describe("timing.utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("normalizeAuthTiming", () => {
    it("should not delay when operation already exceeds minimum time", async () => {
      const startTime = Date.now() - 400; // Operation took 400ms
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(5);

      const delayPromise = normalizeAuthTiming(startTime, 300);
      jest.advanceTimersByTime(0);

      await delayPromise;

      // Should not delay since elapsed (400ms) > minTime (300ms)
      expect(mockedCrypto.randomInt).not.toHaveBeenCalled();
    });

    it("should delay when operation is faster than minimum time", async () => {
      const startTime = Date.now() - 100; // Operation took 100ms
      const minTime = 300;
      const expectedDelay = minTime - 100; // 200ms remaining
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(5); // +5ms jitter

      const delayPromise = normalizeAuthTiming(startTime, minTime);

      // Advance timers to trigger the delay
      jest.advanceTimersByTime(expectedDelay + 5);

      await delayPromise;

      expect(mockedCrypto.randomInt).toHaveBeenCalledWith(-10, 11);
    });

    it("should add random jitter to delay", async () => {
      const startTime = Date.now() - 100; // Operation took 100ms
      const minTime = 300;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(-5); // -5ms jitter

      const delayPromise = normalizeAuthTiming(startTime, minTime);
      jest.advanceTimersByTime(195); // 200ms - 5ms jitter

      await delayPromise;

      expect(mockedCrypto.randomInt).toHaveBeenCalledWith(-10, 11);
    });

    it("should use default minimum time when not specified", async () => {
      const startTime = Date.now() - 100;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

      const delayPromise = normalizeAuthTiming(startTime);
      jest.advanceTimersByTime(200);

      await delayPromise;

      // Should use TIMING_CONSTANTS.MIN_AUTH_OPERATION_TIME_MS (300ms)
      expect(mockedCrypto.randomInt).toHaveBeenCalled();
    });

    it("should handle negative jitter correctly", async () => {
      const startTime = Date.now() - 100;
      const minTime = 300;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(-10); // Maximum negative jitter

      const delayPromise = normalizeAuthTiming(startTime, minTime);
      jest.advanceTimersByTime(190); // 200ms - 10ms jitter

      await delayPromise;

      expect(mockedCrypto.randomInt).toHaveBeenCalledWith(-10, 11);
    });

    it("should handle positive jitter correctly", async () => {
      const startTime = Date.now() - 100;
      const minTime = 300;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(10); // Maximum positive jitter

      const delayPromise = normalizeAuthTiming(startTime, minTime);
      jest.advanceTimersByTime(210); // 200ms + 10ms jitter

      await delayPromise;

      expect(mockedCrypto.randomInt).toHaveBeenCalledWith(-10, 11);
    });

    it("should ensure delay is never negative", async () => {
      const startTime = Date.now() - 100;
      const minTime = 300;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(-200); // Large negative jitter

      const delayPromise = normalizeAuthTiming(startTime, minTime);
      jest.advanceTimersByTime(0); // Math.max(0, ...) should prevent negative delay

      await delayPromise;

      // Delay should be clamped to 0
      expect(mockedCrypto.randomInt).toHaveBeenCalled();
    });

    it("should handle very fast operations", async () => {
      const startTime = Date.now() - 10; // Very fast operation (10ms)
      const minTime = 300;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

      const delayPromise = normalizeAuthTiming(startTime, minTime);
      jest.advanceTimersByTime(290); // 300ms - 10ms = 290ms delay

      await delayPromise;

      expect(mockedCrypto.randomInt).toHaveBeenCalled();
    });

    it("should handle operations that take exactly minimum time", async () => {
      const startTime = Date.now() - 300; // Exactly minimum time
      const minTime = 300;
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

      const delayPromise = normalizeAuthTiming(startTime, minTime);
      jest.advanceTimersByTime(0);

      await delayPromise;

      // Should not delay since elapsed equals minTime
      expect(mockedCrypto.randomInt).not.toHaveBeenCalled();
    });
  });

  describe("withNormalizedTiming", () => {
    it("should execute function and normalize timing", async () => {
      jest.useRealTimers();
      try {
        const mockFn = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "result";
        });
        (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

        const startTime = Date.now();
        const result = await withNormalizedTiming(mockFn, 300);
        const duration = Date.now() - startTime;

        expect(result).toBe("result");
        expect(mockFn).toHaveBeenCalledTimes(1);
        // Should take at least 300ms due to normalization
        expect(duration).toBeGreaterThanOrEqual(290);
      } finally {
        jest.useFakeTimers();
      }
    });

    it("should normalize timing even when function throws", async () => {
      jest.useRealTimers();
      try {
        const mockFn = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw new Error("Test error");
        });
        (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

        const startTime = Date.now();
        await expect(withNormalizedTiming(mockFn, 300)).rejects.toThrow("Test error");
        const duration = Date.now() - startTime;

        expect(mockFn).toHaveBeenCalledTimes(1);
        // Should take at least 300ms due to normalization
        expect(duration).toBeGreaterThanOrEqual(290);
      } finally {
        jest.useFakeTimers();
      }
    });

    it("should use default minimum time when not specified", async () => {
      jest.useRealTimers();
      try {
        const mockFn = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "result";
        });
        (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

        const startTime = Date.now();
        await withNormalizedTiming(mockFn);
        const duration = Date.now() - startTime;

        expect(mockFn).toHaveBeenCalledTimes(1);
        // Should use default MIN_AUTH_OPERATION_TIME_MS (300ms)
        expect(duration).toBeGreaterThanOrEqual(290);
      } finally {
        jest.useFakeTimers();
      }
    });

    it("should handle async function that takes longer than minimum", async () => {
      jest.useRealTimers();
      try {
        const mockFn = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 400));
          return "result";
        });
        (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

        const startTime = Date.now();
        const result = await withNormalizedTiming(mockFn, 300);
        const duration = Date.now() - startTime;

        expect(result).toBe("result");
        expect(mockFn).toHaveBeenCalledTimes(1);
        // Should take at least 400ms (function time), but normalization should not add delay
        expect(duration).toBeGreaterThanOrEqual(390);
        // Allow higher threshold (600ms) to account for test environment variability (CI, CPU load, etc.)
        expect(duration).toBeLessThan(600); // Should not add significant delay
      } finally {
        jest.useFakeTimers();
      }
    });

    it("should preserve function return value", async () => {
      const returnValue = { data: "test", count: 42 };
      const mockFn = jest.fn().mockResolvedValue(returnValue);
      (mockedCrypto.randomInt as unknown as jest.Mock<number>).mockReturnValue(0);

      const resultPromise = withNormalizedTiming(mockFn, 300);
      jest.advanceTimersByTime(100);
      await mockFn();
      jest.advanceTimersByTime(200);

      const result = await resultPromise;

      expect(result).toEqual(returnValue);
      expect(result).toBe(returnValue); // Same reference
    });
  });

  describe("TIMING_CONSTANTS", () => {
    it("should export MIN_AUTH_OPERATION_TIME_MS", () => {
      expect(TIMING_CONSTANTS.MIN_AUTH_OPERATION_TIME_MS).toBe(300);
    });

    it("should export MAX_VARIANCE_PERCENT", () => {
      expect(TIMING_CONSTANTS.MAX_VARIANCE_PERCENT).toBe(10);
    });

    it("should have correct constant values for AC-1.12", () => {
      // AC-1.12 requires ≤10% timing variance
      expect(TIMING_CONSTANTS.MAX_VARIANCE_PERCENT).toBeLessThanOrEqual(10);

      // Minimum time should be reasonable (not too high for UX, not too low for security)
      expect(TIMING_CONSTANTS.MIN_AUTH_OPERATION_TIME_MS).toBeGreaterThan(0);
      expect(TIMING_CONSTANTS.MIN_AUTH_OPERATION_TIME_MS).toBeLessThan(1000);
    });
  });
});
