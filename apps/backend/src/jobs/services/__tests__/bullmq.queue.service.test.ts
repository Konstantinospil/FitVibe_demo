import { jest } from "@jest/globals";
import { BullMQQueueService, getBullMQService, shutdownBullMQ } from "../bullmq.queue.service.js";

const queueRegistry = new Map<string, any>();
const workerRegistry = new Map<string, any>();

jest.mock("bullmq", () => {
  // Access the outer registries through a getter to avoid hoisting issues
  const getQueueRegistry = () => queueRegistry;
  const getWorkerRegistry = () => workerRegistry;

  class QueueMock {
    public jobs: any[] = [];
    public failedJobs: any[] = [];
    public stats = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    public paused = false;
    public closed = false;
    public cleaned: string[] = [];

    constructor(public name: string) {
      getQueueRegistry().set(name, this);
    }

    add(jobName: string, payload: Record<string, unknown>) {
      const job: any = {
        id: `${jobName}-${this.jobs.length + 1}`,
        name: jobName,
        data: payload,
        retry: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      this.jobs.push(job);
      this.stats.waiting += 1;
      return Promise.resolve(job);
    }

    count() {
      return Promise.resolve(this.jobs.length);
    }

    getWaitingCount() {
      return Promise.resolve(this.stats.waiting);
    }

    getActiveCount() {
      return Promise.resolve(this.stats.active);
    }

    getCompletedCount() {
      return Promise.resolve(this.stats.completed);
    }

    getFailedCount() {
      return Promise.resolve(this.stats.failed);
    }

    getDelayedCount() {
      return Promise.resolve(this.stats.delayed);
    }

    getFailed(start: number, end: number) {
      return Promise.resolve(this.failedJobs.slice(start, end + 1));
    }

    getJob(id: string) {
      return Promise.resolve(
        this.jobs.concat(this.failedJobs).find((job) => job.id === id) ?? null,
      );
    }

    clean(grace: number, _limit: number, status: string) {
      const token = `${status}-${grace}`;
      this.cleaned.push(token);
      return Promise.resolve([token]);
    }

    pause() {
      this.paused = true;
      return Promise.resolve();
    }

    resume() {
      this.paused = false;
      return Promise.resolve();
    }

    close() {
      this.closed = true;
      return Promise.resolve();
    }
  }

  class WorkerMock {
    public closed = false;

    constructor(public name: string) {
      getWorkerRegistry().set(name, this);
    }

    on() {
      // no-op
    }

    close() {
      this.closed = true;
      return Promise.resolve();
    }
  }

  return {
    Queue: QueueMock,
    Worker: WorkerMock,
  };
});

jest.mock("../../../config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../services/retention.service.js", () => ({
  runRetentionSweep: jest.fn().mockResolvedValue({ purged: 5 }),
}));

jest.mock("../../../modules/points/streaks.service.js", () => ({
  evaluateStreakBonus: jest.fn().mockResolvedValue({ bonus: 10 }),
}));

jest.mock("../../../modules/points/seasonal-events.service.js", () => ({
  evaluateSeasonalEvents: jest.fn().mockResolvedValue({ awarded: true }),
}));

jest.mock("../../../db/index.js", () => ({
  __esModule: true,
  default: {
    raw: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("BullMQQueueService", () => {
  const services: BullMQQueueService[] = [];

  beforeEach(() => {
    queueRegistry.clear();
    workerRegistry.clear();
  });

  afterEach(async () => {
    // Clean up all services created during tests
    for (const service of services) {
      try {
        await service.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
    services.length = 0;
    await shutdownBullMQ();
  });

  it("initializes queues and workers for known job types", () => {
    const service = new BullMQQueueService({
      host: "redis.example",
      port: 6380,
      db: 2,
    });
    services.push(service);

    expect(queueRegistry.size).toBeGreaterThanOrEqual(4);
    expect(workerRegistry.size).toBeGreaterThanOrEqual(4);
    expect(() => service.enqueue({ name: "retention.sweep", payload: {} })).not.toThrow();
  });

  it("enqueues jobs and reports queue stats", async () => {
    const service = new BullMQQueueService();
    services.push(service);
    const queue = queueRegistry.get("leaderboard.refresh")!;
    queue.stats = { waiting: 2, active: 1, completed: 5, failed: 0, delayed: 0 };

    await service.enqueue({ name: "leaderboard.refresh", payload: { trigger: true } });
    const stats = await service.getQueueStats("leaderboard.refresh");

    expect(stats).toMatchObject({ waiting: 3, active: 1, completed: 5 });
    expect(queue.jobs[0]).toMatchObject({ name: "leaderboard.refresh" });
  });

  it("supports listing failed jobs and manual retry/remove", async () => {
    const service = new BullMQQueueService();
    services.push(service);
    const queue = queueRegistry.get("points.streaks.evaluate")!;
    const failedJob = {
      id: "failed-1",
      retry: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    queue.failedJobs.push(failedJob);

    const failed = await service.getFailedJobs("points.streaks.evaluate");
    expect(failed).toHaveLength(1);

    await service.retryFailedJob("points.streaks.evaluate", "failed-1");
    expect(failedJob.retry).toHaveBeenCalled();

    await service.removeFailedJob("points.streaks.evaluate", "failed-1");
    expect(failedJob.remove).toHaveBeenCalled();
  });

  it("cleans, pauses, resumes, and shuts down queues", async () => {
    const service = new BullMQQueueService();
    services.push(service);
    const queue = queueRegistry.get("retention.sweep")!;
    const worker = workerRegistry.get("retention.sweep")!;

    const cleaned = await service.cleanQueue("retention.sweep", 1000, "completed");
    expect(cleaned).toEqual(["completed-1000"]);

    await service.pauseQueue("retention.sweep");
    expect(queue.paused).toBe(true);

    await service.resumeQueue("retention.sweep");
    expect(queue.paused).toBe(false);

    await service.shutdown();
    expect(queue.closed).toBe(true);
    expect(worker.closed).toBe(true);
  });

  it("manages singleton lifecycle via helper functions", async () => {
    const original = process.env.REDIS_ENABLED;
    process.env.REDIS_ENABLED = "true";

    const instanceA = getBullMQService();
    const instanceB = getBullMQService();
    expect(instanceA).toBeInstanceOf(BullMQQueueService);
    expect(instanceA).toBe(instanceB);

    await shutdownBullMQ();
    expect(getBullMQService()).toBeInstanceOf(BullMQQueueService);

    await shutdownBullMQ();
    process.env.REDIS_ENABLED = original;
  });
});
