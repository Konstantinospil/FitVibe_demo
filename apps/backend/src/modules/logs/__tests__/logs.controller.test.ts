/**
 * Unit tests for logs controller
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";
import * as controller from "../logs.controller";
import * as service from "../logs.service";

// Mock the service
jest.mock("../logs.service", () => ({
  listLogs: jest.fn(),
  getRecentActivity: jest.fn(),
}));

describe("Logs Controller", () => {
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
  });

  describe("listLogsHandler", () => {
    it("should return audit logs", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "user-1",
          action: "user.login",
          resourceType: "user",
          resourceId: "user-1",
          metadata: {},
          createdAt: new Date(),
        },
      ];

      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: { limit: "10" },
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({ logs: mockLogs });
    });
  });

  describe("recentActivityHandler", () => {
    it("should return recent admin activity", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "admin-1",
          action: "user.status.updated",
          resourceType: "user",
          resourceId: "user-2",
          metadata: {},
          createdAt: new Date(),
        },
      ];

      jest.mocked(service.getRecentActivity).mockResolvedValue(mockLogs);

      mockReq = {
        query: { limit: "5" },
      };

      await controller.recentActivityHandler(mockReq as Request, mockRes as Response);

      expect(service.getRecentActivity).toHaveBeenCalledWith(5);
      expect(jsonMock).toHaveBeenCalledWith({ activity: mockLogs });
    });
  });
});
