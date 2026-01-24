import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";

import {
  addBioValue,
  createBioAttribute,
  listBioAttributes,
  updateBioVisibility,
} from "../../../../apps/backend/src/modules/measurements/measurements.controller.js";
import {
  addMeasurementValue,
  createMeasurementAttribute,
  listMeasurementAttributesForUser,
  updateMeasurementVisibility,
} from "../../../../apps/backend/src/modules/measurements/measurements.service.js";

jest.mock("../../../../apps/backend/src/modules/measurements/measurements.service.js", () => ({
  addMeasurementValue: jest.fn(),
  createMeasurementAttribute: jest.fn(),
  listMeasurementAttributesForUser: jest.fn(),
  updateMeasurementVisibility: jest.fn(),
}));

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe("measurements controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when listing attributes without user", async () => {
    const req = { user: undefined, query: {} } as Request;
    const res = createResponse();

    await listBioAttributes(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("validates list query params", async () => {
    const req = {
      user: { sub: "user-1" },
      query: { lang: "x" },
    } as unknown as Request;
    const res = createResponse();

    await listBioAttributes(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("lists attributes for a user", async () => {
    jest.mocked(listMeasurementAttributesForUser).mockResolvedValue([]);
    const req = {
      user: { sub: "user-1" },
      query: { q: "search", includeHidden: "true", lang: "en" },
    } as unknown as Request;
    const res = createResponse();

    await listBioAttributes(req, res);

    expect(listMeasurementAttributesForUser).toHaveBeenCalledWith("bio", "user-1", {
      q: "search",
      includeHidden: true,
      lang: "en",
    });
    expect(res.json).toHaveBeenCalledWith({ attributes: [] });
  });

  it("creates an attribute when payload is valid", async () => {
    const req = {
      user: { sub: "user-1" },
      body: {
        label: "Height",
        unitType: "length",
        granularity: "cm",
        measurementSystem: "metric",
      },
    } as Request;
    const res = createResponse();

    jest.mocked(createMeasurementAttribute).mockResolvedValue({ id: "attr-1" } as never);

    await createBioAttribute(req, res);

    expect(createMeasurementAttribute).toHaveBeenCalledWith("bio", "user-1", {
      key: undefined,
      label: "Height",
      description: null,
      unitType: "length",
      granularity: "cm",
      measurementSystem: "metric",
      minValue: undefined,
      maxValue: undefined,
      derivedFromAId: undefined,
      derivedFromBId: undefined,
      derivedOperator: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ attribute: { id: "attr-1" } });
  });

  it("validates attribute payloads", async () => {
    const req = { user: { sub: "user-1" }, body: { label: "" } } as Request;
    const res = createResponse();

    await createBioAttribute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("adds a measurement value", async () => {
    const req = {
      user: { sub: "user-1" },
      params: { attributeId: "attr-1" },
      body: { valueNumber: 10 },
    } as unknown as Request;
    const res = createResponse();

    jest
      .mocked(addMeasurementValue)
      .mockResolvedValue({ attributeId: "attr-1", valueNumber: 10, measuredAt: "now" });

    await addBioValue(req, res);

    expect(addMeasurementValue).toHaveBeenCalledWith("bio", "user-1", "attr-1", 10, undefined);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      latestValue: { attributeId: "attr-1", valueNumber: 10, measuredAt: "now" },
    });
  });

  it("validates add value requests", async () => {
    const res = createResponse();

    await addBioValue({ user: undefined } as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);

    await addBioValue({ user: { sub: "user-1" }, params: {} } as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await addBioValue(
      { user: { sub: "user-1" }, params: { attributeId: "attr" }, body: {} } as Request,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updates visibility", async () => {
    const req = {
      user: { sub: "user-1" },
      params: { attributeId: "attr-1" },
      body: { isVisible: true },
    } as unknown as Request;
    const res = createResponse();

    await updateBioVisibility(req, res);

    expect(updateMeasurementVisibility).toHaveBeenCalledWith("bio", "user-1", "attr-1", true);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("validates visibility updates", async () => {
    const res = createResponse();

    await updateBioVisibility({ user: undefined } as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);

    await updateBioVisibility({ user: { sub: "user-1" }, params: {} } as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await updateBioVisibility(
      { user: { sub: "user-1" }, params: { attributeId: "attr" }, body: {} } as Request,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
