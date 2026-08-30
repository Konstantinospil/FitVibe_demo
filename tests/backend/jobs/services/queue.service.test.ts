import { jest } from "@jest/globals";
import type { QueueJob } from "../../../../apps/backend/src/jobs/services/queue.service.js";
import { QueueService } from "../../../../apps/backend/src/jobs/services/queue.service.js";

jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../../apps/backend/src/services/retention.service.js", () => ({
  runRetentionSweep: jest.fn().mockResolvedValue({ purged: 1 }),
}));

jest.mock("../../../../apps/backend/src/modules/points/streaks.service.js", () => ({
  evaluateStreakBonus: jest.fn().mockResolvedValue({ points: 5 }),
}));

jest.mock("../../../../apps/backend/src/modules/points/seasonal-events.service.js", () => ({
  evaluateSeasonalEvents: jest.fn().mockResolvedValue({ applied: true }),
}));

jest.mock("../../../../apps/backend/src/db/index.js", () => ({
  __esModule: true,
  default: {
    raw: jest.fn().mockResolvedValue(undefined),
  },
}));

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));
const flushAttempts = async (count: number) => {
  for (let i = 0; i < count; i += 1) {
    await flushAsync();
  }
};

describe("QueueService", () => {
  let service: QueueService;
  let timeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    timeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
      queueMicrotask(() => callback());
      return 0 as unknown as NodeJS.Timeout;
    });
    service = new QueueService();
  });

  afterEach(() => {
    // Clean up the service to clear any pending timers
    if (service) {
      service.shutdown();
    }
    timeoutSpy.mockRestore();
  });

  it("processes custom jobs that succeed", async () => {
    const processedJobs: QueueJob[] = [];
    service.registerHandler("analytics.summary", (job: QueueJob) => {
      processedJobs.push(job);
      return Promise.resolve();
    });

    service.enqueue({ name: "analytics.summary", payload: { run: true } });
    await flushAttempts(1);

    expect(processedJobs[0]).toMatchObject({
      name: "analytics.summary",
      payload: expect.objectContaining({ run: true }),
    });
    expect(service.getQueueLength()).toBe(0);
  });

  it("retries failing jobs and moves them to the dead-letter queue", async () => {
    let attempts = 0;
    service.registerHandler("unstable.job", (_job: QueueJob) => {
      attempts += 1;
      return Promise.reject(new Error(`boom-${attempts}`));
    });

    service.enqueue({ name: "unstable.job", payload: {} });
    await flushAttempts(3);

    expect(attempts).toBe(3);
    const failures = service.getDeadLetterQueue();
    expect(failures).toHaveLength(1);
    expect(failures[0].totalAttempts).toBe(3);
    expect(failures[0].finalError).toBe("boom-3");
  });

  it("allows retrying a dead-letter job after fixing the handler", async () => {
    let attempts = 0;
    service.registerHandler("recoverable.job", (_job: QueueJob) => {
      attempts += 1;
      if (attempts <= 3) {
        return Promise.reject(new Error("still failing"));
      }
      return Promise.resolve();
    });

    service.enqueue({ name: "recoverable.job", payload: { important: true } });
    await flushAttempts(3);
    expect(service.getDeadLetterQueue()).toHaveLength(1);

    const retried = service.retryDeadLetterJob(0);
    expect(retried).toBe(true);
    expect(service.getDeadLetterQueue()).toHaveLength(0);

    await flushAttempts(1);
    expect(attempts).toBe(4);
    expect(service.getQueueLength()).toBe(0);
  });

  it("clears the dead-letter queue when requested", async () => {
    service.registerHandler("always.fail", (_job: QueueJob) => {
      return Promise.reject(new Error("fail"));
    });

    service.enqueue({ name: "always.fail", payload: {} });
    await flushAttempts(3);
    expect(service.getDeadLetterQueue()).toHaveLength(1);

    service.clearDeadLetterQueue();
    expect(service.getDeadLetterQueue()).toHaveLength(0);
  });
});
