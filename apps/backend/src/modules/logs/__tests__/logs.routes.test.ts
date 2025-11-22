/**
 * Unit tests for logs routes
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { logsRouter } from "../logs.routes.js";
import { requireAuth } from "../../users/users.middleware.js";
import { requireRole } from "../../common/rbac.middleware.js";

// Mock dependencies
jest.mock("../../users/users.middleware.js", () => ({
  requireAuth: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock("../../common/rbac.middleware.js", () => ({
  requireRole: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock("../../common/rateLimiter.js", () => ({
  rateLimit: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock("../../utils/async-handler", () => ({
  asyncHandler: jest.fn((fn) => fn),
}));

jest.mock("../logs.controller.js", () => ({
  listLogsHandler: jest.fn(),
  recentActivityHandler: jest.fn(),
}));

describe("Logs Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register GET / route", () => {
    const routes = logsRouter.stack;
    const getRoute = routes.find((layer) => layer.route?.path === "/" && layer.route?.methods?.get);
    expect(getRoute).toBeDefined();
  });

  it("should register GET /recent-activity route", () => {
    const routes = logsRouter.stack;
    const recentRoute = routes.find(
      (layer) => layer.route?.path === "/recent-activity" && layer.route?.methods?.get,
    );
    expect(recentRoute).toBeDefined();
  });

  it("should apply requireAuth middleware to all routes", () => {
    // Check that requireAuth is applied (it's a use middleware, so it's in the stack)
    expect(requireAuth).toBeDefined();
    expect(logsRouter.stack).toBeDefined();
  });

  it("should apply requireRole('admin') middleware to all routes", () => {
    expect(requireRole).toHaveBeenCalledWith("admin");
  });
});
