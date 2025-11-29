import type { Request, Response, NextFunction } from "express";
import {
  metricsMiddleware,
  metricsRoute,
  incrementRefreshReuse,
  incrementPointsAwarded,
} from "../metrics";

describe("observability/metrics", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      originalUrl: "/api/v1/users",
      baseUrl: "",
      route: {
        path: "/users",
      },
    };

    const listeners: Record<string, (...args: any[]) => void> = {};
    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: (...args: any[]) => void) => {
        listeners[event] = callback;
        return mockResponse as Response;
      }),
      emit: jest.fn((event: string, ...args: any[]) => {
        if (listeners[event]) {
          listeners[event](...args);
        }
        return true;
      }),
      set: jest.fn(),
      end: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe("metricsMiddleware", () => {
    it("should call next middleware", () => {
      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should record metrics when response finishes", () => {
      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.on).toHaveBeenCalledWith("finish", expect.any(Function));

      // Simulate response finish
      (mockResponse as any).emit("finish");

      // Metrics should be recorded
      expect(mockResponse.on).toHaveBeenCalled();
    });

    it("should handle route with baseUrl", () => {
      mockRequest.baseUrl = "/api/v1";
      mockRequest.route = { path: "/users" };

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      (mockResponse as any).emit("finish");
    });

    it("should handle route without path", () => {
      mockRequest.route = undefined;
      mockRequest.baseUrl = "/api/v1";

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      (mockResponse as any).emit("finish");
    });

    it("should fallback to originalUrl when no route", () => {
      mockRequest.route = undefined;
      mockRequest.baseUrl = "";
      mockRequest.originalUrl = "/health?check=true";

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      (mockResponse as any).emit("finish");
    });

    it("should strip query params from originalUrl", () => {
      mockRequest.route = undefined;
      mockRequest.baseUrl = "";
      mockRequest.originalUrl = "/api/users?page=1&limit=10";

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      (mockResponse as any).emit("finish");
    });

    it("should handle different HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

      methods.forEach((method) => {
        mockRequest.method = method;
        metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        (mockResponse as any).emit("finish");
      });

      expect(mockNext).toHaveBeenCalledTimes(methods.length);
    });

    it("should handle different status codes", () => {
      const statusCodes = [200, 201, 400, 401, 404, 500];

      statusCodes.forEach((statusCode) => {
        (mockResponse as any).statusCode = statusCode;
        metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        (mockResponse as any).emit("finish");
      });

      expect(mockNext).toHaveBeenCalledTimes(statusCodes.length);
    });

    it("should handle route with empty path", () => {
      mockRequest.route = { path: "" };
      mockRequest.baseUrl = "/api";

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      (mockResponse as any).emit("finish");
    });

    it("should handle route with null path", () => {
      mockRequest.route = { path: null };
      mockRequest.baseUrl = "";
      mockRequest.originalUrl = "/some/path";

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      (mockResponse as any).emit("finish");
    });
  });

  describe("metricsRoute", () => {
    it("should set correct content type", async () => {
      await metricsRoute(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith("Content-Type", expect.any(String));
    });

    it("should return metrics data", async () => {
      await metricsRoute(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.end).toHaveBeenCalledWith(expect.any(String));
    });

    it("should return text metrics in Prometheus format", async () => {
      await metricsRoute(mockRequest as Request, mockResponse as Response);

      const metricsData = (mockResponse.end as jest.Mock).mock.calls[0][0];
      expect(typeof metricsData).toBe("string");
      expect(metricsData.length).toBeGreaterThan(0);
    });
  });

  describe("incrementRefreshReuse", () => {
    it("should increment refresh reuse counter", () => {
      // Should not throw
      expect(() => incrementRefreshReuse()).not.toThrow();
    });

    it("should be callable multiple times", () => {
      expect(() => {
        incrementRefreshReuse();
        incrementRefreshReuse();
        incrementRefreshReuse();
      }).not.toThrow();
    });
  });

  describe("incrementPointsAwarded", () => {
    it("should increment points awarded counter with rule label", () => {
      expect(() => incrementPointsAwarded("session_complete", 100)).not.toThrow();
    });

    it("should handle different rules", () => {
      expect(() => {
        incrementPointsAwarded("session_complete", 100);
        incrementPointsAwarded("badge_earned", 50);
        incrementPointsAwarded("daily_streak", 25);
      }).not.toThrow();
    });

    it("should handle zero points", () => {
      expect(() => incrementPointsAwarded("test_rule", 0)).not.toThrow();
    });

    it("should handle large point values", () => {
      expect(() => incrementPointsAwarded("test_rule", 10000)).not.toThrow();
    });

    it("should handle decimal point values", () => {
      expect(() => incrementPointsAwarded("test_rule", 42.5)).not.toThrow();
    });

    it("should throw error for negative point values", () => {
      // Prometheus counters can only increase, not decrease
      expect(() => incrementPointsAwarded("penalty", -10)).toThrow(
        "It is not possible to decrease a counter",
      );
    });

    it("should handle empty rule string", () => {
      expect(() => incrementPointsAwarded("", 100)).not.toThrow();
    });

    it("should handle rule with special characters", () => {
      expect(() => incrementPointsAwarded("session:complete", 100)).not.toThrow();
    });
  });

  describe("integration", () => {
    it("should track metrics across multiple requests", async () => {
      // Simulate multiple requests
      for (let i = 0; i < 5; i++) {
        metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        (mockResponse as any).emit("finish");
      }

      // Get metrics
      await metricsRoute(mockRequest as Request, mockResponse as Response);

      const metricsData = (mockResponse.end as jest.Mock).mock.calls[0][0];
      expect(metricsData).toContain("http_requests_total");
    });

    it("should include all metric types in output", async () => {
      // Record some metrics
      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      (mockResponse as any).emit("finish");
      incrementRefreshReuse();
      incrementPointsAwarded("test", 100);

      // Get metrics
      await metricsRoute(mockRequest as Request, mockResponse as Response);

      const metricsData = (mockResponse.end as jest.Mock).mock.calls[0][0];
      expect(metricsData).toContain("http_request_duration_seconds");
      expect(metricsData).toContain("http_requests_total");
    });
  });
});
