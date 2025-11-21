import { jest } from "@jest/globals";
import { leaderboardJobsService } from "../leaderboard-jobs.service.js";
import { queueService } from "../queue.factory.js";
import { logger } from "../../../config/logger.js";

jest.mock("../queue.factory.js", () => ({
  queueService: {
    enqueue: jest.fn(),
  },
}));

jest.mock("../../../config/logger.js", () => ({
  logger: {
    debug: jest.fn(),
  },
}));

const mockedQueueService = jest.mocked(queueService);
const mockedLogger = jest.mocked(logger);

describe("LeaderboardJobsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("enqueues a leaderboard refresh job with explicit parameters", () => {
    const job = leaderboardJobsService.scheduleRefresh("week", "cron");

    expect(job.name).toBe("leaderboard.refresh");
    expect(job.payload).toMatchObject({
      period: "week",
      triggeredBy: "cron",
    });
    expect(typeof job.payload.queuedAt).toBe("string");
    expect(mockedQueueService.enqueue).toHaveBeenCalledWith(job);
    expect(mockedLogger.debug).toHaveBeenCalledWith({ job }, "[jobs] enqueued leaderboard refresh");
  });

  it("defaults to manual trigger when not provided", () => {
    const job = leaderboardJobsService.scheduleRefresh("month");

    expect(job.payload.triggeredBy).toBe("manual");
    expect(mockedQueueService.enqueue).toHaveBeenCalledWith(job);
  });
});
