/**
 * Unit tests for health router
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";
import { healthRouter } from "../../../../apps/backend/src/modules/health/health.router.js";

describe("Health Router", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };

    mockReq = {};
  });

  describe("GET /", () => {
    it("should return health status", () => {
      const routes = healthRouter.stack;
      expect(routes.length).toBeGreaterThan(0);

      // Find the GET / route
      const healthRoute = routes.find(
        (layer) =>
          layer.route?.path === "/" &&
          (layer.route as { methods?: { get?: boolean } })?.methods?.get,
      );
      expect(healthRoute).toBeDefined();

      if (healthRoute?.route) {
        const handler = healthRoute.route.stack[0]?.handle;
        expect(handler).toBeDefined();

        // Call the handler
        handler(mockReq as Request, mockRes as Response, jest.fn());

        // Verify response
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "ok",
            timestamp: expect.any(String),
          }),
        );
      }
    });

    it("should return ISO timestamp", () => {
      const routes = healthRouter.stack;
      const healthRoute = routes.find(
        (layer) =>
          layer.route?.path === "/" &&
          (layer.route as { methods?: { get?: boolean } })?.methods?.get,
      );

      if (healthRoute?.route) {
        const handler = healthRoute.route.stack[0]?.handle;
        handler(mockReq as Request, mockRes as Response, jest.fn());

        const callArgs = jsonMock.mock.calls[0][0];
        expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });
});
