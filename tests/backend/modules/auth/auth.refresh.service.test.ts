import jwt from "jsonwebtoken";
import * as service from "../../../../apps/backend/src/modules/auth/auth.refresh.service.js";
import * as authRepository from "../../../../apps/backend/src/modules/auth/auth.repository.js";
import * as metrics from "../../../../apps/backend/src/observability/metrics.js";
import * as audit from "../../../../apps/backend/src/modules/auth/auth.audit.js";
import * as legalGate from "../../../../apps/backend/src/modules/auth/auth.legal-gate.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

jest.mock("jsonwebtoken");
jest.mock("../../../../apps/backend/src/modules/auth/auth.repository.js");
jest.mock("../../../../apps/backend/src/observability/metrics.js");
jest.mock("../../../../apps/backend/src/modules/auth/auth.audit.js");
jest.mock("../../../../apps/backend/src/modules/auth/auth.legal-gate.js");
jest.mock("../../../../apps/backend/src/modules/auth/auth.session-tokens.js", () => ({
  nextSessionExpiry: jest.fn(() => "2026-10-01T00:00:00.000Z"),
  signAccess: jest.fn(() => "new-access"),
  signRefresh: jest.fn(() => "new-refresh"),
}));

const mockJwt = jest.mocked(jwt);
const mockRepository = jest.mocked(authRepository);
const mockMetrics = jest.mocked(metrics);
const mockAudit = jest.mocked(audit);
const mockLegalGate = jest.mocked(legalGate);

describe("auth.refresh.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLegalGate.assertTermsRequirementSatisfied.mockResolvedValue(undefined);
    mockJwt.verify.mockReturnValue({
      sub: "user-1",
      sid: "session-1",
      typ: "refresh",
    } as never);
  });

  it("does not rotate refresh state when persisted terms require re-acceptance", async () => {
    mockRepository.getRefreshByHash.mockResolvedValue({
      id: "refresh-1", user_id: "user-1", token_hash: "hash", session_jti: "session-1",
      expires_at: "2099-10-01T00:00:00.000Z", created_at: "2026-09-21T00:00:00.000Z", revoked_at: null,
    });
    mockRepository.findSessionById.mockResolvedValue({
      jti: "session-1", user_id: "user-1", user_agent: null, ip: null,
      created_at: "2026-09-21T00:00:00.000Z", expires_at: "2099-10-01T00:00:00.000Z", revoked_at: null,
    });
    mockRepository.findUserById.mockResolvedValue({ id: "user-1", status: "active", role_code: "athlete" } as never);
    mockLegalGate.assertTermsRequirementSatisfied.mockRejectedValue(
      new HttpError(403, "TERMS_VERSION_OUTDATED", "TERMS_VERSION_OUTDATED"),
    );

    await expect(service.refresh("refresh-token")).rejects.toMatchObject({ code: "TERMS_VERSION_OUTDATED" });
    expect(mockRepository.revokeRefreshByHash).not.toHaveBeenCalled();
    expect(mockRepository.insertRefreshToken).not.toHaveBeenCalled();
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
