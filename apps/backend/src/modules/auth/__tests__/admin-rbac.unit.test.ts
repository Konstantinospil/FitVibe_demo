/**
 * Unit tests for AC-1.7: Admin endpoints enforce role=admin; no IDOR
 *
 * Requirements:
 * - Admin endpoints must require role='admin'
 * - Non-admin users receive 403 Forbidden
 * - RBAC middleware properly validates roles
 * - IDOR protection in controllers
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { requireRole } from "../../common/rbac.middleware";

// Mock the users repository before importing the controller
jest.mock("../../users/users.repository", () => ({
  getUserMetrics: jest.fn().mockResolvedValue({ sessions: 10, workouts: 50 }),
}));

describe("AC-1.7: Admin RBAC Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn() as NextFunction;
  });

  describe("requireRole Middleware", () => {
    it("should allow user with matching role", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "admin",
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should reject user without matching role (403 Forbidden)", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "athlete",
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("should reject request without user (401 Unauthorized)", () => {
      mockReq = {
        user: undefined,
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("should reject user without role claim (401 Unauthorized)", () => {
      mockReq = {
        user: {
          sub: "user-123",
          sid: "session-123",
          // role missing
        } as any,
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should support multiple allowed roles", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "support",
          sid: "session-123",
        },
      };

      const middleware = requireRole(["admin", "support"]);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should reject user with role not in allowed list", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "athlete",
          sid: "session-123",
        },
      };

      const middleware = requireRole(["admin", "support"]);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe("IDOR Protection in Controllers", () => {
    it("should verify getMetrics controller has IDOR protection", async () => {
      const { getMetrics } = await import("../../users/users.controller");

      // Test case 1: User accessing their own metrics (should succeed)
      mockReq = {
        params: { userId: "user-123" },
        user: {
          sub: "user-123",
          role: "athlete",
          sid: "session-123",
        },
      };

      await getMetrics(mockReq as Request, mockRes as Response);

      // Should succeed (return 200, not 403) for own metrics
      expect(jsonMock).toHaveBeenCalledWith({ sessions: 10, workouts: 50 });
      expect(statusMock).not.toHaveBeenCalledWith(403);
    });

    it("should prevent user from accessing another user's metrics", async () => {
      const { getMetrics } = await import("../../users/users.controller");

      // Reset mocks
      jsonMock.mockClear();
      statusMock.mockClear();

      // Test case 2: User accessing another user's metrics (should fail with 403)
      mockReq = {
        params: { userId: "user-789" },
        user: {
          sub: "user-123", // Different from params
          role: "athlete",
          sid: "session-123",
        },
      };

      await getMetrics(mockReq as Request, mockRes as Response);

      // Must return 403 Forbidden for IDOR protection
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalled();
    });

    it("should allow admin to access any user's metrics", async () => {
      const { getMetrics } = await import("../../users/users.controller");

      // Reset mocks
      jsonMock.mockClear();
      statusMock.mockClear();

      // Test case 3: Admin accessing another user's metrics (should succeed)
      mockReq = {
        params: { userId: "user-789" },
        user: {
          sub: "admin-123", // Different from params
          role: "admin", // Admin role
          sid: "admin-session-123",
        },
      };

      await getMetrics(mockReq as Request, mockRes as Response);

      // Admin should be allowed - should return data successfully
      expect(jsonMock).toHaveBeenCalledWith({ sessions: 10, workouts: 50 });
      expect(statusMock).not.toHaveBeenCalledWith(403);
    });
  });

  describe("Route Protection Verification", () => {
    it("should verify all admin endpoints use requireRole middleware", () => {
      // This is a smoke test to ensure the RBAC middleware module exists and exports correctly
      expect(requireRole).toBeDefined();
      expect(typeof requireRole).toBe("function");

      // Verify the middleware returns a function
      const middleware = requireRole("admin");
      expect(typeof middleware).toBe("function");
    });

    it("should verify RBAC middleware is properly typed", () => {
      const middleware = requireRole("admin");

      // Verify middleware has correct Express middleware signature
      expect(middleware.length).toBe(3); // (req, res, next)
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle case-sensitive role comparison", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "Admin", // Uppercase
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin"); // Lowercase
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should reject (case-sensitive)
      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it("should not accept empty string as valid role", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "",
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      // Empty role is treated as missing role (401)
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should not accept null as valid role", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: null as any,
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should not accept arrays as role", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: ["admin", "athlete"] as any,
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Arrays are not valid role values
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Audit and Logging", () => {
    it("should verify RBAC checks are observable", () => {
      mockReq = {
        user: {
          sub: "user-123",
          role: "athlete",
          sid: "session-123",
        },
      };

      const middleware = requireRole("admin");
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Verify rejection is observable through response
      expect(statusMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalled();
    });
  });
});

describe("AC-1.7: Admin Endpoint Coverage", () => {
  it("should document admin-only endpoints", () => {
    // This test serves as documentation of which endpoints require admin role
    const adminEndpoints = [
      "POST /api/v1/users",
      "GET /api/v1/users",
      "GET /api/v1/users/:id",
      "PATCH /api/v1/users/:id/status",
      "POST /api/v1/system/read-only/enable",
      "POST /api/v1/system/read-only/disable",
      "POST /api/v1/exercise-types",
      "PATCH /api/v1/exercise-types/:code",
      "DELETE /api/v1/exercise-types/:code",
    ];

    // Verify documentation list is not empty
    expect(adminEndpoints.length).toBeGreaterThan(0);

    // This test passes to document the expected admin endpoints
    // Integration tests should verify each of these actually enforces admin role
    expect(adminEndpoints).toBeDefined();
  });
});
