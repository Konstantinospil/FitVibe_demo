import { PointsJobsService } from "../../../../apps/backend/src/jobs/services/points-jobs.service.js";
import { queueService } from "../../../../apps/backend/src/jobs/services/queue.factory.js";
import { logger } from "../../../../apps/backend/src/config/logger.js";

jest.mock("../../../../apps/backend/src/jobs/services/queue.factory.js", () => ({
  queueService: { enqueue: jest.fn() },
}));

jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: { debug: jest.fn() },
}));

describe("PointsJobsService", () => {
  const enqueueMock = jest.mocked(queueService.enqueue);
  const loggerMock = jest.mocked(logger.debug);

  beforeEach(() => {
    enqueueMock.mockClear();
    loggerMock.mockClear();
  });

  it("enqueues a job and logs it", () => {
    const service = new PointsJobsService();
    const job = { name: "points.streaks.evaluate", payload: { userId: "u1" } };

    service.schedule(job);

    expect(enqueueMock).toHaveBeenCalledWith(job);
    expect(loggerMock).toHaveBeenCalledWith({ job }, "[jobs] Enqueued points job");
  });

  it("schedules streak evaluation with the expected payload", () => {
    const service = new PointsJobsService();

    service.scheduleStreakEvaluation("user-1", "session-1", "2024-01-01T00:00:00Z");

    expect(enqueueMock).toHaveBeenCalledWith({
      name: "points.streaks.evaluate",
      payload: {
        userId: "user-1",
        sessionId: "session-1",
        completedAt: "2024-01-01T00:00:00Z",
      },
    });
  });

  it("schedules seasonal event sweeps with the expected payload", () => {
    const service = new PointsJobsService();

    service.scheduleSeasonalEventSweep("user-2", "session-2", "2024-02-01T00:00:00Z");

    expect(enqueueMock).toHaveBeenCalledWith({
      name: "points.seasonal_events.evaluate",
      payload: {
        userId: "user-2",
        sessionId: "session-2",
        completedAt: "2024-02-01T00:00:00Z",
      },
    });
  });
});
