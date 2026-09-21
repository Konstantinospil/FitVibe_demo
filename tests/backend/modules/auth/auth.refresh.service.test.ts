import jwt from "jsonwebtoken";
import * as service from "../../../../apps/backend/src/modules/auth/auth.refresh.service.js";
import * as authRepository from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import * as metrics from "../../../../apps/backend/src/observability/metrics.js";
import * as audit from "../../../../apps/backend/src/modules/auth/auth.audit.js";

jest.mock("jsonwebtoken");
jest.mock("../../../../apps/backend/src/modules/auth/auth.repository.js");
jest.mock("../../../../apps/backend/src/observability/metrics.js");
jest.mock("../../../../apps/backend/src/modules/auth/auth.audit.js");
jest.mock("../../../../apps/backend/src/modules/auth/auth.session-tokens.js", () => ({
  nextSessionExpiry: jest.fn(() => "2026-10-01T00:00:00.000Z"),
  signAccess: jest.fn(() => "new-access"),
  signRefresh: jest.fn(() => "new-refresh"),
}));

const mockJwt = jest.mocked(jwt);
const mockRepository = jest.mocked(authRepository);
const mockMetrics = jest.mocked(metrics);
const mockAudit = jest.mocked(audit);

describe("auth.refresh.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.verify.mockReturnValue({
      sub: "user-1",
      sid: "session-1",
      typ: "refresh",
    } as never);
  });

  it("revokes the token family and records reuse when a consumed refresh token is replayed", async () => {
    mockRepository.getRefreshByHash.mockResolvedValue(undefined);
    mockRepository.findRefreshTokenRaw.mockResolvedValue({
      id: "refresh-old",
      user_id: "user-1",
      token_hash: "hash",
      session_jti: "session-1",
      expires_at: "2026-10-01T00:00:00.000Z",
      created_at: "2026-09-21T00:00:00.000Z",
      revoked_at: "2026-09-21T01:00:00.000Z",
    });

    await expect(
      service.refresh("reused-refresh", {
        requestId: "req-1",
        ip: "203.0.113.5",
        userAgent: "test-agent",
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTH_INVALID_REFRESH",
    });

    expect(mockRepository.revokeSessionById).toHaveBeenCalledWith("session-1");
    expect(mockRepository.revokeRefreshBySession).toHaveBeenCalledWith("session-1");
    expect(mockMetrics.incrementRefreshReuse).toHaveBeenCalledTimes(1);
    expect(mockAudit.recordAuthAuditEvent).toHaveBeenCalledWith(
      "user-1",
      "auth.refresh_reuse",
      expect.objectContaining({
        sessionId: "session-1",
        familyRevoked: true,
        outcome: "failure",
      }),
    );
  });
});
