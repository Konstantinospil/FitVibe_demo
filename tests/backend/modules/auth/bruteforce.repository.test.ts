import {
  getRemainingAccountAttempts,
  getRemainingLockoutSeconds,
  isAccountLocked,
  recordFailedAttempt,
  recordFailedAttemptByIP,
  getRemainingIPAttempts,
  isIPLocked,
  getRemainingIPLockoutSeconds,
} from "../../../../apps/backend/src/modules/auth/bruteforce.repository.js";
import { db } from "../../../../apps/backend/src/db/connection.js";
import crypto from "crypto";

jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

jest.spyOn(crypto, "randomUUID").mockImplementation(() => "uuid-1");

const mockDb = jest.mocked(db);

describe("bruteforce.repository", () => {
  let accountBuilder: Record<string, jest.Mock>;
  let ipBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    accountBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      ignore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockReturnThis(),
      del: jest.fn().mockResolvedValue(1),
    };

    ipBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };

    mockDb.mockImplementation((table: string) => {
      if (table === "failed_login_attempts_by_ip") {
        return ipBuilder as never;
      }
      return accountBuilder as never;
    });
  });

  it("records a new failed attempt with no lockout", async () => {
    accountBuilder.first.mockResolvedValueOnce(null);

    const result = await recordFailedAttempt("USER@EXAMPLE.COM", "127.0.0.1", "agent");

    expect(accountBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "uuid-1",
        identifier: "user@example.com",
        ip_address: "127.0.0.1",
        attempt_count: 1,
        locked_until: null,
      }),
    );
    expect(result.attempt_count).toBe(1);
    expect(result.locked_until).toBeNull();
  });

  it("updates existing attempts and returns incremented count", async () => {
    accountBuilder.first
      .mockResolvedValueOnce({
        id: "attempt-1",
        identifier: "user@example.com",
        ip_address: "127.0.0.1",
        user_agent: null,
        attempt_count: 4,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: "attempt-1",
        identifier: "user@example.com",
        ip_address: "127.0.0.1",
        user_agent: null,
        attempt_count: 5,
        locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        last_attempt_at: new Date().toISOString(),
        first_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    const result = await recordFailedAttempt("user@example.com", "127.0.0.1", "agent");

    expect(accountBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_count: 5, locked_until: expect.any(String) }),
    );
    expect(result.attempt_count).toBe(5);
    expect(result.locked_until).toEqual(expect.any(String));
  });

  it("records a new IP-based attempt and tracks distinct emails", async () => {
    ipBuilder.first.mockResolvedValueOnce(null);

    const result = await recordFailedAttemptByIP("10.0.0.1", "user@example.com");

    expect(accountBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "user@example.com",
        ip_address: "10.0.0.1",
      }),
    );
    expect(ipBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: "10.0.0.1",
        distinct_email_count: 1,
        total_attempt_count: 1,
      }),
    );
    expect(result.total_attempt_count).toBe(1);
  });

  it("increments IP counts when existing record is present", async () => {
    ipBuilder.first.mockResolvedValueOnce({
      id: "ip-1",
      ip_address: "10.0.0.2",
      distinct_email_count: 1,
      total_attempt_count: 9,
      locked_until: null,
      last_attempt_at: new Date().toISOString(),
      first_attempt_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    accountBuilder.first.mockResolvedValueOnce({ count: "0" });
    accountBuilder.returning.mockResolvedValueOnce([{ id: "new-attempt" }]);

    const result = await recordFailedAttemptByIP("10.0.0.2", "new@example.com");

    expect(ipBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        distinct_email_count: 2,
        total_attempt_count: 10,
      }),
    );
    expect(result.distinct_email_count).toBe(2);
    expect(result.total_attempt_count).toBe(10);
  });

  it("computes remaining attempts and lockouts", () => {
    expect(getRemainingAccountAttempts(null)).toBe(5);
    expect(isAccountLocked(null)).toBe(false);
    expect(getRemainingLockoutSeconds(null)).toBe(0);

    const future = new Date(Date.now() + 5000).toISOString();
    expect(isAccountLocked({ locked_until: future } as never)).toBe(true);
    expect(getRemainingLockoutSeconds({ locked_until: future } as never)).toBeGreaterThan(0);

    expect(getRemainingIPAttempts(null)).toEqual({
      remainingAttempts: 10,
      remainingDistinctEmails: 5,
    });
    expect(isIPLocked(null)).toBe(false);
    expect(getRemainingIPLockoutSeconds(null)).toBe(0);
  });
});
