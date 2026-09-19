import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import {
  getMyVibeform,
  updateMyVibeformPreferences,
} from "../../../../apps/backend/src/modules/vibeforms/vibeforms.controller.js";
import {
  getVibeformProfile,
  updateVibeformPreferences,
} from "../../../../apps/backend/src/modules/vibeforms/vibeforms.service.js";

jest.mock("../../../../apps/backend/src/modules/vibeforms/vibeforms.service.js", () => ({
  getVibeformProfile: jest.fn(),
  updateVibeformPreferences: jest.fn(),
}));

function response(): Response {
  return {
    locals: { requestId: "request-1" },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("Vibeform controller", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the authenticated user's normalized Vibeform", async () => {
    const profile = { calculationVersion: "1" } as never;
    jest.mocked(getVibeformProfile).mockResolvedValue(profile);
    const req = { user: { sub: "user-1" } } as Request;
    const res = response();

    await getMyVibeform(req, res);

    expect(getVibeformProfile).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith(profile);
  });

  it("rejects requests without authenticated user context", async () => {
    const res = response();

    await getMyVibeform({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(getVibeformProfile).not.toHaveBeenCalled();
  });

  it("updates only validated Vibeform preferences", async () => {
    const preferences = {
      templateCode: "flow",
      templateVersion: 1,
      bodyProfile: "hip-dominant",
      motionEnabled: false,
    } as const;
    jest.mocked(updateVibeformPreferences).mockResolvedValue(preferences);
    const req = {
      user: { sub: "user-1" },
      body: { bodyProfile: "hip-dominant", motionEnabled: false },
    } as Request;
    const res = response();

    await updateMyVibeformPreferences(req, res);

    expect(updateVibeformPreferences).toHaveBeenCalledWith("user-1", {
      bodyProfile: "hip-dominant",
      motionEnabled: false,
    });
    expect(res.json).toHaveBeenCalledWith(preferences);
  });

  it.each([
    ["calculated field", { strength: 1 }],
    ["render field", { strokeWidth: 3 }],
    ["unknown template", { templateCode: "unknown" }],
    ["empty update", {}],
  ])("rejects %s without calling the update service", async (_name, body) => {
    const req = { user: { sub: "user-1" }, body } as Request;
    const res = response();

    await updateMyVibeformPreferences(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(updateVibeformPreferences).not.toHaveBeenCalled();
  });
});
