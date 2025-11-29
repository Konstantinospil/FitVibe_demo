import { jest } from "@jest/globals";

const spawnSyncMock = jest.fn();
jest.mock("child_process", () => ({
  spawnSync: spawnSyncMock,
}));

const dbConfigMock = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  database: "fitvibe_test",
};
jest.mock("../../db.config.js", () => ({
  DB_CONFIG: dbConfigMock,
}));

const queryBuilderMock = jest.fn().mockReturnValue({
  count: jest.fn().mockReturnValue({
    first: jest.fn().mockResolvedValue({ count: "0" }),
  }),
});

const dbMock = Object.assign(
  (table: string) => {
    if (table === "knex_migrations") {
      return queryBuilderMock(table);
    }
    return queryBuilderMock(table);
  },
  {
    migrate: {
      latest: jest.fn(),
      rollback: jest.fn(),
      currentVersion: jest.fn(),
    },
    seed: {
      run: jest.fn(),
    },
    raw: jest.fn(),
    schema: {
      hasTable: jest.fn(),
    },
    destroy: jest.fn(),
  },
);
jest.mock("../../index.js", () => ({
  __esModule: true,
  default: dbMock,
}));

const connectionDbMock = {
  schema: {
    hasTable: jest.fn(),
  },
  select: jest.fn(),
  destroy: jest.fn(),
};
jest.mock("../../connection.js", () => ({
  db: connectionDbMock,
}));

const loggerMock = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
jest.mock("../../../config/logger.js", () => ({
  logger: loggerMock,
}));

const toErrorPayloadMock = jest.fn((error: unknown) => ({
  message: error instanceof Error ? error.message : String(error),
}));
jest.mock("../../../utils/error.utils.js", () => ({
  toErrorPayload: toErrorPayloadMock,
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);

beforeEach(() => {
  jest.clearAllMocks();
  spawnSyncMock.mockReset();
  // migrate.latest returns [batchNo, migrations[]] - default to empty migrations
  dbMock.migrate.latest.mockReset().mockResolvedValue([1, []] as never);
  dbMock.migrate.rollback.mockReset().mockResolvedValue([[]] as never);
  dbMock.migrate.currentVersion.mockReset().mockResolvedValue("20240101000000");
  dbMock.seed.run.mockReset().mockResolvedValue(undefined);
  dbMock.raw.mockReset().mockResolvedValue(undefined);
  dbMock.schema.hasTable.mockReset().mockResolvedValue(true);
  dbMock.destroy.mockReset().mockResolvedValue(undefined);
  queryBuilderMock.mockReset().mockReturnValue({
    count: jest.fn().mockReturnValue({
      first: jest.fn().mockResolvedValue({ count: "0" }),
    }),
  });
  connectionDbMock.schema.hasTable.mockReset().mockResolvedValue(true);
  connectionDbMock.destroy.mockReset().mockResolvedValue(undefined);
  connectionDbMock.select.mockReset().mockImplementation(() => {
    const union = jest.fn().mockResolvedValue([{ matviewname: "session_summary" }]);
    const where = jest.fn().mockReturnValue({ union });
    const from = jest.fn().mockReturnValue({ where, union });
    return { from, where, union };
  });
  toErrorPayloadMock.mockReset().mockImplementation((error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }));
  exitSpy.mockClear();
  process.exitCode = undefined;
});

afterAll(() => {
  exitSpy.mockRestore();
});

describe("backupDatabase", () => {
  it("logs success when pg_dump succeeds", async () => {
    spawnSyncMock.mockReturnValue({ status: 0 } as never);

    await jest.isolateModulesAsync(async () => {
      await import("../backupDatabase.js");
    });

    expect(spawnSyncMock).toHaveBeenCalledWith(
      "pg_dump",
      expect.arrayContaining([
        `--host=${dbConfigMock.host}`,
        expect.stringContaining(`--file=backup_${dbConfigMock.database}_`),
      ]),
      { stdio: "inherit" },
    );
    expect(loggerMock.info).toHaveBeenCalledWith("Backup completed successfully.");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits when pg_dump fails", async () => {
    spawnSyncMock.mockReturnValue({ status: 2 } as never);

    await jest.isolateModulesAsync(async () => {
      await import("../backupDatabase.js");
    });

    expect(loggerMock.error).toHaveBeenCalledWith("Backup failed.");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

describe("migration & seed scripts", () => {
  it("applies migrations and destroys the connection", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../migrateAll.js");
      // Wait for the async main() function to complete
      // The main() function runs asynchronously, so we need to wait for it
      await new Promise((resolve) => setTimeout(resolve, 100));
      await flushPromises();
    });

    expect(dbMock.migrate.latest).toHaveBeenCalledTimes(1);
    expect(dbMock.destroy).toHaveBeenCalledTimes(1);
    // Check that both log messages were called
    expect(loggerMock.info).toHaveBeenCalledWith("[db] Applying migrations (all environments)...");
    expect(loggerMock.info).toHaveBeenCalledWith("[db] No new migrations to apply.");
    expect(loggerMock.info).toHaveBeenCalledWith("[db] Migrations applied successfully.");
  });

  it("reports migration failures and exits", async () => {
    dbMock.migrate.latest.mockRejectedValueOnce(new Error("boom"));

    await jest.isolateModulesAsync(async () => {
      await import("../migrateAll.js");
      await flushPromises();
    });

    expect(loggerMock.error).toHaveBeenCalledWith(
      { message: "boom" },
      "Failed to apply migrations.",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(dbMock.destroy).toHaveBeenCalled();
  });

  it("rolls back all migrations when requested", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../rollbackAll.js");
      await flushPromises();
    });

    expect(dbMock.migrate.rollback).toHaveBeenCalledWith(undefined, true);
    expect(dbMock.destroy).toHaveBeenCalled();
  });

  it("runs all seeds successfully", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../seedAll.js");
      await flushPromises();
    });

    expect(dbMock.seed.run).toHaveBeenCalled();
    expect(dbMock.destroy).toHaveBeenCalled();
  });
});

describe("postDeploy tasks", () => {
  it("ensures partitions and refreshes views", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../postDeploy.js");
      await flushPromises();
    });

    expect(dbMock.raw).toHaveBeenNthCalledWith(1, "SELECT public.ensure_monthly_partitions();");
    expect(dbMock.raw).toHaveBeenNthCalledWith(2, "SELECT public.refresh_session_summary(TRUE);");
    expect(dbMock.destroy).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      "[post-deploy] Completed database maintenance tasks.",
    );
  });

  it("sets exit code when maintenance fails but keeps process alive", async () => {
    dbMock.raw.mockRejectedValueOnce(new Error("partition failure"));

    await jest.isolateModulesAsync(async () => {
      await import("../postDeploy.js");
      await flushPromises();
    });

    expect(loggerMock.error).toHaveBeenCalledWith(
      { message: "partition failure" },
      "[post-deploy] Maintenance tasks failed",
    );
    expect(process.exitCode).toBe(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe("verifyIntegrity script", () => {
  it("checks every table and view then closes the connection", async () => {
    await jest.isolateModulesAsync(async () => {
      await import("../verifyIntegrity.js");
      await flushPromises();
    });

    expect(connectionDbMock.schema.hasTable).toHaveBeenCalledWith("roles");
    expect(connectionDbMock.schema.hasTable.mock.calls.length).toBeGreaterThan(10);
    expect(connectionDbMock.select).toHaveBeenCalled();
    expect(connectionDbMock.destroy).toHaveBeenCalled();
  });
});

describe("db utils barrel module", () => {
  it("re-exports individual utility modules", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock("../backupDatabase.js", () => ({ __esModule: true, backupSentinel: true }));
      jest.doMock("../migrateAll.js", () => ({ __esModule: true, migrateSentinel: true }));
      jest.doMock("../postDeploy.js", () => ({ __esModule: true, postDeploySentinel: true }));
      jest.doMock("../rollbackAll.js", () => ({ __esModule: true, rollbackSentinel: true }));
      jest.doMock("../seedAll.js", () => ({ __esModule: true, seedSentinel: true }));
      jest.doMock("../verifyIntegrity.js", () => ({
        __esModule: true,
        verifySentinel: true,
      }));

      const exports = await import("../index.js");
      expect(exports).toMatchObject({
        backupSentinel: true,
        migrateSentinel: true,
        postDeploySentinel: true,
        rollbackSentinel: true,
        seedSentinel: true,
        verifySentinel: true,
      });
      jest.dontMock("../backupDatabase.js");
      jest.dontMock("../migrateAll.js");
      jest.dontMock("../postDeploy.js");
      jest.dontMock("../rollbackAll.js");
      jest.dontMock("../seedAll.js");
      jest.dontMock("../verifyIntegrity.js");
    });
  });
});
