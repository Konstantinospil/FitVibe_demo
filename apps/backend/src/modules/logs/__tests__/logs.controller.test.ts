/**
 * Unit tests for logs controller
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";
import * as controller from "../logs.controller";
import * as service from "../logs.service";
import type { AuditLogEntry } from "../logs.types";

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
          actorUserId: "user-1",
          actorUsername: "testuser",
          entityType: "user",
          action: "user.login",
          entityId: "user-1",
          outcome: "success",
          requestId: "req-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        },
      ];

      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: { limit: "10" },
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
      expect(jsonMock).toHaveBeenCalledWith({ logs: mockLogs });
    });

    it("should parse query parameters correctly", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: {
          action: "user.login",
          entityType: "user",
          actorUserId: "user-123",
          outcome: "success",
          limit: "25",
          offset: "5",
        },
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalledWith({
        action: "user.login",
        entityType: "user",
        actorUserId: "user-123",
        outcome: "success",
        limit: 25,
        offset: 5,
      });
    });

    it("should use default values when query params are missing", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: {},
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
      });
    });
  });

  describe("recentActivityHandler", () => {
    it("should return recent admin activity", async () => {
      const mockLogs: AuditLogEntry[] = [
        {
          id: "log-1",
          actorUserId: "admin-1",
          actorUsername: "admin",
          entityType: "user",
          action: "user_suspended",
          entityId: "user-2",
          outcome: "success",
          requestId: "req-1",
          metadata: {},
          createdAt: new Date().toISOString(),
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

    it("should use default limit when not provided", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.getRecentActivity).mockResolvedValue(mockLogs);

      mockReq = {
        query: {},
      };

      await controller.recentActivityHandler(mockReq as Request, mockRes as Response);

      expect(service.getRecentActivity).toHaveBeenCalledWith(20);
      expect(jsonMock).toHaveBeenCalledWith({ activity: mockLogs });
    });

    it("should handle invalid limit values gracefully", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.getRecentActivity).mockResolvedValue(mockLogs);

      mockReq = {
        query: { limit: "invalid" },
      };

      await controller.recentActivityHandler(mockReq as Request, mockRes as Response);

      expect(service.getRecentActivity).toHaveBeenCalledWith(NaN);
      expect(jsonMock).toHaveBeenCalledWith({ activity: mockLogs });
    });
  });

  describe("listLogsHandler edge cases", () => {
    it("should handle invalid limit values", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: { limit: "not-a-number", offset: "5" },
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalledWith({
        limit: NaN,
        offset: 5,
      });
      expect(jsonMock).toHaveBeenCalledWith({ logs: mockLogs });
    });

    it("should handle invalid offset values", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: { limit: "10", offset: "invalid" },
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalledWith({
        limit: 10,
        offset: NaN,
      });
      expect(jsonMock).toHaveBeenCalledWith({ logs: mockLogs });
    });

    it("should handle undefined query parameters", async () => {
      const mockLogs: AuditLogEntry[] = [];
      jest.mocked(service.listLogs).mockResolvedValue(mockLogs);

      mockReq = {
        query: {
          action: undefined,
          entityType: undefined,
          actorUserId: undefined,
          outcome: undefined,
        },
      };

      await controller.listLogsHandler(mockReq as Request, mockRes as Response);

      expect(service.listLogs).toHaveBeenCalledWith({
        action: undefined,
        entityType: undefined,
        actorUserId: undefined,
        outcome: undefined,
        limit: 100,
        offset: 0,
      });
      expect(jsonMock).toHaveBeenCalledWith({ logs: mockLogs });
    });
  });
});
