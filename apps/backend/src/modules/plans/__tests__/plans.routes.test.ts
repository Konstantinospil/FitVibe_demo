/**
 * Unit tests for plans routes
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { plansRouter } from "../plans.routes.js";

// Mock dependencies
jest.mock("../../auth/auth.middleware", () => ({
  requireAccessToken: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock("../../utils/async-handler", () => ({
  asyncHandler: jest.fn((fn) => fn),
}));

jest.mock("../plans.controller.js", () => ({
  listPlansHandler: jest.fn(),
  getPlanHandler: jest.fn(),
  createPlanHandler: jest.fn(),
  updatePlanHandler: jest.fn(),
  archivePlanHandler: jest.fn(),
  deletePlanHandler: jest.fn(),
  getPlanStatsHandler: jest.fn(),
}));

describe("Plans Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register GET /stats route", () => {
    const routes = plansRouter.stack;
    const statsRoute = routes.find(
      (layer) => layer.route?.path === "/stats" && layer.route?.methods?.get,
    );
    expect(statsRoute).toBeDefined();
  });

  it("should register GET / route", () => {
    const routes = plansRouter.stack;
    const listRoute = routes.find(
      (layer) => layer.route?.path === "/" && layer.route?.methods?.get,
    );
    expect(listRoute).toBeDefined();
  });

  it("should register POST / route", () => {
    const routes = plansRouter.stack;
    const createRoute = routes.find(
      (layer) => layer.route?.path === "/" && layer.route?.methods?.post,
    );
    expect(createRoute).toBeDefined();
  });

  it("should register GET /:id route", () => {
    const routes = plansRouter.stack;
    const getRoute = routes.find(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.get,
    );
    expect(getRoute).toBeDefined();
  });

  it("should register PATCH /:id route", () => {
    const routes = plansRouter.stack;
    const updateRoute = routes.find(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.patch,
    );
    expect(updateRoute).toBeDefined();
  });

  it("should register POST /:id/archive route", () => {
    const routes = plansRouter.stack;
    const archiveRoute = routes.find(
      (layer) => layer.route?.path === "/:id/archive" && layer.route?.methods?.post,
    );
    expect(archiveRoute).toBeDefined();
  });

  it("should register DELETE /:id route", () => {
    const routes = plansRouter.stack;
    const deleteRoute = routes.find(
      (layer) => layer.route?.path === "/:id" && layer.route?.methods?.delete,
    );
    expect(deleteRoute).toBeDefined();
  });
});
