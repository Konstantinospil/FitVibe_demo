import { describe, expect, it, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

jest.mock("../../../../apps/backend/src/modules/auth/auth.middleware.js", () => ({
  requireAccessToken: jest.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));
jest.mock("../../../../apps/backend/src/modules/common/rateLimiter.js", () => ({
  rateLimit: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));
jest.mock("../../../../apps/backend/src/utils/async-handler.js", () => ({
  asyncHandler: jest.fn((handler: unknown) => handler),
}));
jest.mock("../../../../apps/backend/src/modules/vibeforms/vibeforms.controller.js", () => ({
  getMyVibeform: jest.fn(),
  updateMyVibeformPreferences: jest.fn(),
}));

import { vibeformsRouter } from "../../../../apps/backend/src/modules/vibeforms/vibeforms.routes.js";

describe("Vibeform routes", () => {
  it("registers authenticated GET /me", () => {
    const route = vibeformsRouter.stack.find(
      (layer) => layer.route?.path === "/me" && layer.route.methods.get,
    );
    expect(route).toBeDefined();
    expect(route?.route?.stack).toHaveLength(3);
  });

  it("registers authenticated PUT /me/preferences", () => {
    const route = vibeformsRouter.stack.find(
      (layer) => layer.route?.path === "/me/preferences" && layer.route.methods.put,
    );
    expect(route).toBeDefined();
    expect(route?.route?.stack).toHaveLength(3);
  });
});
