export {};

const destroyMock = jest.fn();
const migrateLatestMock = jest.fn();
const migrateRollbackMock = jest.fn();
const rawMock = jest.fn();

jest.mock("../../../../apps/backend/src/db/index.js", () => ({
  __esModule: true,
  default: {
    destroy: destroyMock,
    migrate: {
      latest: migrateLatestMock,
      rollback: migrateRollbackMock,
    },
    raw: rawMock,
  },
}));

const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: loggerInfoMock,
    warn: loggerWarnMock,
    error: loggerErrorMock,
  },
}));

const runRetentionSweepMock = jest.fn();
jest.mock("../../../../apps/backend/src/services/retention.service.js", () => ({
  runRetentionSweep: runRetentionSweepMock,
}));

const processExitMock = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const runScript = async (script: string) => {
  await import(`../../../../apps/backend/src/db/scripts/${script}.js`);
  await flushPromises();
  await flushPromises();
};

describe("db scripts", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    destroyMock.mockResolvedValue(undefined);
    migrateLatestMock.mockResolvedValue(undefined);
    migrateRollbackMock.mockResolvedValue(undefined);
    rawMock.mockResolvedValue(undefined);
    runRetentionSweepMock.mockResolvedValue({
      purgedIdempotencyKeys: 1,
      purgedAuthTokens: 2,
      purgedRefreshTokens: 3,
      processedDsrRequests: 4,
    });
  });

  afterAll(() => {
    processExitMock.mockRestore();
  });

  describe("migrate.ts", () => {
    it("applies latest migrations and closes connection", async () => {
      await runScript("migrate");

      expect(migrateLatestMock).toHaveBeenCalled();
      expect(destroyMock).toHaveBeenCalled();
      expect(processExitMock).not.toHaveBeenCalled();
    });

    it("logs and exits when migration fails", async () => {
      const error = new Error("fail");
      migrateLatestMock.mockRejectedValueOnce(error);

      await runScript("migrate");

      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        "Database migrations failed",
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("rollback.ts", () => {
    it("rolls back migrations and destroys connection", async () => {
      await runScript("rollback");

      expect(migrateRollbackMock).toHaveBeenCalledWith(undefined, true);
      expect(destroyMock).toHaveBeenCalled();
    });

    it("logs and exits when rollback fails", async () => {
      const error = new Error("rollback-fail");
      migrateRollbackMock.mockRejectedValueOnce(error);

      await runScript("rollback");

      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        "Database rollback failed",
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("refresh-materialized.ts", () => {
    it("refreshes analytics materialized views", async () => {
      await runScript("refresh-materialized");

      expect(rawMock).toHaveBeenNthCalledWith(1, "SELECT public.refresh_session_summary(TRUE);");
      expect(rawMock).toHaveBeenNthCalledWith(2, "REFRESH MATERIALIZED VIEW mv_leaderboard;");
      expect(destroyMock).toHaveBeenCalled();
    });

    it("logs and exits when refresh fails", async () => {
      const error = new Error("refresh-fail");
      rawMock.mockRejectedValueOnce(error);

      await runScript("refresh-materialized");

      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        "Failed to refresh materialized views",
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("rotate-partitions.ts", () => {
    it("ensures partitions and cleans up", async () => {
      await runScript("rotate-partitions");

      expect(rawMock).toHaveBeenCalledWith("SELECT public.ensure_monthly_partitions();");
      expect(destroyMock).toHaveBeenCalled();
    });

    it("logs and exits when rotation fails", async () => {
      const error = new Error("partition-fail");
      rawMock.mockRejectedValueOnce(error);

      await runScript("rotate-partitions");

      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        "Failed to rotate partitions",
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("run-retention.ts", () => {
    it("logs summary on success and destroys connection", async () => {
      await runScript("run-retention");

      expect(runRetentionSweepMock).toHaveBeenCalled();
      expect(loggerInfoMock).toHaveBeenCalledWith(
        {
          purgedIdempotencyKeys: 1,
          purgedAuthTokens: 2,
          purgedRefreshTokens: 3,
          processedDsrRequests: 4,
        },
        "[retention] sweep completed",
      );
      expect(destroyMock).toHaveBeenCalled();
      expect(processExitMock).not.toHaveBeenCalled();
    });

    it("logs and exits when retention sweep fails", async () => {
      const error = new Error("sweep-fail");
      runRetentionSweepMock.mockRejectedValueOnce(error);

      await runScript("run-retention");

      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        "[retention] sweep failed",
      );
      expect(destroyMock).toHaveBeenCalled();
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });
});
