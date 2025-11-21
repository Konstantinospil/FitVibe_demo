import * as retentionService from "../retention.service";
import { db } from "../../db/connection.js";
import { processDueAccountDeletions } from "../../modules/users/dsr.service.js";

jest.mock("../../db/connection.js", () => {
  const mockDb = jest.fn();
  return { db: mockDb };
});

jest.mock("../../modules/users/dsr.service.js", () => ({
  processDueAccountDeletions: jest.fn(),
}));

type QueryBuilderMock = {
  where: jest.Mock;
  orWhere: jest.Mock;
  whereNotNull: jest.Mock;
  andWhere: jest.Mock;
  del: jest.Mock;
};

const dbMock = db as unknown as jest.Mock;
const mockedProcessDueAccountDeletions = processDueAccountDeletions as jest.MockedFunction<
  typeof processDueAccountDeletions
>;

function createBuilder(result: number): QueryBuilderMock {
  const builder: QueryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn(),
    whereNotNull: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(result),
  };

  builder.orWhere.mockImplementation((callback?: (this: QueryBuilderMock) => void) => {
    callback?.call(builder);
    return builder;
  });

  return builder;
}

function enqueueBuilder(result: number): QueryBuilderMock {
  const builder = createBuilder(result);
  dbMock.mockReturnValueOnce(builder);
  return builder;
}

describe("Retention Service", () => {
  beforeEach(() => {
    dbMock.mockReset();
    mockedProcessDueAccountDeletions.mockReset();
    mockedProcessDueAccountDeletions.mockResolvedValue(0);
  });

  it("purges idempotency keys older than 24 hours", async () => {
    const builder = enqueueBuilder(7);
    const now = new Date("2025-01-02T00:00:00.000Z");

    const deleted = await retentionService.purgeStaleIdempotencyKeys(now);

    expect(deleted).toBe(7);
    expect(dbMock).toHaveBeenCalledWith("idempotency_keys");
    expect(builder.where).toHaveBeenCalledWith("created_at", "<", "2025-01-01T00:00:00.000Z");
    expect(builder.del).toHaveBeenCalled();
  });

  it("purges auth tokens that expired before now", async () => {
    const builder = enqueueBuilder(3);
    const now = new Date("2025-01-02T12:30:00.000Z");

    const deleted = await retentionService.purgeExpiredAuthTokens(now);

    expect(deleted).toBe(3);
    expect(dbMock).toHaveBeenCalledWith("auth_tokens");
    expect(builder.where).toHaveBeenCalledWith("expires_at", "<", now.toISOString());
    expect(builder.del).toHaveBeenCalled();
  });

  it("purges refresh tokens based on expiry and revoked thresholds", async () => {
    const builder = enqueueBuilder(11);
    const now = new Date("2025-02-01T00:00:00.000Z");
    const revokedThresholdIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const deleted = await retentionService.purgeExpiredRefreshTokens(now);

    expect(deleted).toBe(11);
    expect(dbMock).toHaveBeenCalledWith("refresh_tokens");
    expect(builder.where).toHaveBeenCalledWith("expires_at", "<", now.toISOString());
    expect(builder.orWhere).toHaveBeenCalled();
    expect(builder.whereNotNull).toHaveBeenCalledWith("revoked_at");
    expect(builder.andWhere).toHaveBeenCalledWith("revoked_at", "<", revokedThresholdIso);
    expect(builder.del).toHaveBeenCalled();
  });

  it("purges unverified accounts older than 7 days", async () => {
    const builder = enqueueBuilder(2);
    const now = new Date("2025-01-10T00:00:00.000Z");
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const deleted = await retentionService.purgeUnverifiedAccounts(now);

    expect(deleted).toBe(2);
    expect(dbMock).toHaveBeenCalledWith("users");
    expect(builder.where).toHaveBeenCalledWith("status", "pending_verification");
    expect(builder.andWhere).toHaveBeenCalledWith("created_at", "<", sevenDaysAgoIso);
    expect(builder.del).toHaveBeenCalled();
  });

  it("aggregates retention sweep results from all helpers", async () => {
    enqueueBuilder(5); // purgeStaleIdempotencyKeys
    enqueueBuilder(4); // purgeExpiredAuthTokens
    enqueueBuilder(3); // purgeExpiredRefreshTokens
    enqueueBuilder(1); // purgeUnverifiedAccounts
    mockedProcessDueAccountDeletions.mockResolvedValue(2);

    const now = new Date("2025-03-01T00:00:00.000Z");
    const summary = await retentionService.runRetentionSweep(now);

    expect(summary).toEqual({
      purgedIdempotencyKeys: 5,
      purgedAuthTokens: 4,
      purgedRefreshTokens: 3,
      purgedUnverifiedAccounts: 1,
      processedDsrRequests: 2,
    });
    expect(dbMock).toHaveBeenNthCalledWith(1, "idempotency_keys");
    expect(dbMock).toHaveBeenNthCalledWith(2, "auth_tokens");
    expect(dbMock).toHaveBeenNthCalledWith(3, "refresh_tokens");
    expect(dbMock).toHaveBeenNthCalledWith(4, "users");
    expect(mockedProcessDueAccountDeletions).toHaveBeenCalledWith(now);
  });
});
