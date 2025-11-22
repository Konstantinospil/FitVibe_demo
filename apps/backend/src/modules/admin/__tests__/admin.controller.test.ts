/**
 * Unit tests for admin controller
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";
import { HttpError } from "../../../utils/http.js";
import * as controller from "../admin.controller.js";
import * as service from "../admin.service.js";

// Mock the service
jest.mock("../admin.service.js", () => ({
  listReports: jest.fn(),
  moderateReport: jest.fn(),
  searchUsersService: jest.fn(),
  performUserAction: jest.fn(),
}));

describe("Admin Controller", () => {
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

  describe("listReportsHandler", () => {
    it("should return reports with default query", async () => {
      const mockReports = [
        {
          id: "report-1",
          reporterId: "user-1",
          reporterUsername: "reporter",
          feedItemId: "item-1",
          commentId: null,
          reason: "spam",
          details: null,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
          contentPreview: "test content",
          contentAuthor: "author",
        },
      ];

      jest.mocked(service.listReports).mockResolvedValue(mockReports);

      mockReq = {
        query: {},
      };

      await controller.listReportsHandler(mockReq as Request, mockRes as Response);

      expect(service.listReports).toHaveBeenCalledWith({
        status: "pending",
        limit: 50,
        offset: 0,
      });
      expect(jsonMock).toHaveBeenCalledWith({ reports: mockReports });
    });

    it("should handle query parameters", async () => {
      const mockReports: unknown[] = [];
      jest.mocked(service.listReports).mockResolvedValue(mockReports);

      mockReq = {
        query: {
          status: "reviewed",
          limit: "25",
          offset: "10",
        },
      };

      await controller.listReportsHandler(mockReq as Request, mockRes as Response);

      expect(service.listReports).toHaveBeenCalledWith({
        status: "reviewed",
        limit: 25,
        offset: 10,
      });
    });

    it("should cap limit at 100", async () => {
      jest.mocked(service.listReports).mockResolvedValue([]);

      mockReq = {
        query: {
          limit: "200",
        },
      };

      await controller.listReportsHandler(mockReq as Request, mockRes as Response);

      expect(service.listReports).toHaveBeenCalledWith({
        status: "pending",
        limit: 100,
        offset: 0,
      });
    });
  });

  describe("moderateReportHandler", () => {
    it("should moderate report successfully", async () => {
      jest.mocked(service.moderateReport).mockResolvedValue(undefined);

      mockReq = {
        params: { reportId: "report-1" },
        body: { action: "dismiss" },
        user: { sub: "admin-1" },
      };

      await controller.moderateReportHandler(mockReq as Request, mockRes as Response);

      expect(service.moderateReport).toHaveBeenCalledWith({
        reportId: "report-1",
        action: "dismiss",
        adminId: "admin-1",
      });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining("Report"),
      });
    });

    it("should throw error if user not authenticated", async () => {
      mockReq = {
        params: { reportId: "report-1" },
        body: { action: "dismiss" },
        user: undefined,
      };

      await expect(
        controller.moderateReportHandler(mockReq as Request, mockRes as Response),
      ).rejects.toThrow(HttpError);

      expect(service.moderateReport).not.toHaveBeenCalled();
    });

    it("should throw error for invalid action", async () => {
      mockReq = {
        params: { reportId: "report-1" },
        body: { action: "invalid" },
        user: { sub: "admin-1" },
      };

      await expect(
        controller.moderateReportHandler(mockReq as Request, mockRes as Response),
      ).rejects.toThrow(HttpError);

      expect(service.moderateReport).not.toHaveBeenCalled();
    });

    it("should handle hide action", async () => {
      jest.mocked(service.moderateReport).mockResolvedValue(undefined);

      mockReq = {
        params: { reportId: "report-1" },
        body: { action: "hide" },
        user: { sub: "admin-1" },
      };

      await controller.moderateReportHandler(mockReq as Request, mockRes as Response);

      expect(service.moderateReport).toHaveBeenCalledWith({
        reportId: "report-1",
        action: "hide",
        adminId: "admin-1",
      });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "Report hidden successfully",
      });
    });

    it("should handle ban action", async () => {
      jest.mocked(service.moderateReport).mockResolvedValue(undefined);

      mockReq = {
        params: { reportId: "report-1" },
        body: { action: "ban" },
        user: { sub: "admin-1" },
      };

      await controller.moderateReportHandler(mockReq as Request, mockRes as Response);

      expect(service.moderateReport).toHaveBeenCalledWith({
        reportId: "report-1",
        action: "ban",
        adminId: "admin-1",
      });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "Report banned successfully",
      });
    });
  });

  describe("searchUsersHandler", () => {
    it("should search users successfully", async () => {
      const mockUsers = [
        {
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          roleCode: "user",
          status: "active" as const,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          sessionCount: 10,
          reportCount: 0,
        },
      ];

      jest.mocked(service.searchUsersService).mockResolvedValue(mockUsers);

      mockReq = {
        query: { q: "testuser" },
      };

      await controller.searchUsersHandler(mockReq as Request, mockRes as Response);

      expect(service.searchUsersService).toHaveBeenCalledWith({
        query: "testuser",
        limit: 20,
        offset: 0,
      });
      expect(jsonMock).toHaveBeenCalledWith({ users: mockUsers });
    });

    it("should throw error if query missing", async () => {
      mockReq = {
        query: {},
      };

      await expect(
        controller.searchUsersHandler(mockReq as Request, mockRes as Response),
      ).rejects.toThrow(HttpError);

      expect(service.searchUsersService).not.toHaveBeenCalled();
    });

    it("should cap limit at 50", async () => {
      jest.mocked(service.searchUsersService).mockResolvedValue([]);

      mockReq = {
        query: { q: "test", limit: "100" },
      };

      await controller.searchUsersHandler(mockReq as Request, mockRes as Response);

      expect(service.searchUsersService).toHaveBeenCalledWith({
        query: "test",
        limit: 50,
        offset: 0,
      });
    });
  });

  describe("userActionHandler", () => {
    it("should suspend user successfully", async () => {
      jest.mocked(service.performUserAction).mockResolvedValue(undefined);

      mockReq = {
        params: { userId: "user-1" },
        body: { action: "suspend", reason: "Violation" },
        user: { sub: "admin-1" },
      };

      await controller.userActionHandler(mockReq as Request, mockRes as Response);

      expect(service.performUserAction).toHaveBeenCalledWith({
        userId: "user-1",
        action: "suspend",
        adminId: "admin-1",
        reason: "Violation",
      });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "User suspended successfully",
      });
    });

    it("should throw error if user not authenticated", async () => {
      mockReq = {
        params: { userId: "user-1" },
        body: { action: "suspend" },
        user: undefined,
      };

      await expect(
        controller.userActionHandler(mockReq as Request, mockRes as Response),
      ).rejects.toThrow(HttpError);

      expect(service.performUserAction).not.toHaveBeenCalled();
    });

    it("should throw error for invalid action", async () => {
      mockReq = {
        params: { userId: "user-1" },
        body: { action: "invalid" },
        user: { sub: "admin-1" },
      };

      await expect(
        controller.userActionHandler(mockReq as Request, mockRes as Response),
      ).rejects.toThrow(HttpError);

      expect(service.performUserAction).not.toHaveBeenCalled();
    });

    it("should handle ban action", async () => {
      jest.mocked(service.performUserAction).mockResolvedValue(undefined);

      mockReq = {
        params: { userId: "user-1" },
        body: { action: "ban" },
        user: { sub: "admin-1" },
      };

      await controller.userActionHandler(mockReq as Request, mockRes as Response);

      expect(service.performUserAction).toHaveBeenCalledWith({
        userId: "user-1",
        action: "ban",
        adminId: "admin-1",
        reason: undefined,
      });
    });

    it("should handle activate action", async () => {
      jest.mocked(service.performUserAction).mockResolvedValue(undefined);

      mockReq = {
        params: { userId: "user-1" },
        body: { action: "activate" },
        user: { sub: "admin-1" },
      };

      await controller.userActionHandler(mockReq as Request, mockRes as Response);

      expect(service.performUserAction).toHaveBeenCalledWith({
        userId: "user-1",
        action: "activate",
        adminId: "admin-1",
        reason: undefined,
      });
    });

    it("should handle delete action", async () => {
      jest.mocked(service.performUserAction).mockResolvedValue(undefined);

      mockReq = {
        params: { userId: "user-1" },
        body: { action: "delete" },
        user: { sub: "admin-1" },
      };

      await controller.userActionHandler(mockReq as Request, mockRes as Response);

      expect(service.performUserAction).toHaveBeenCalledWith({
        userId: "user-1",
        action: "delete",
        adminId: "admin-1",
        reason: undefined,
      });
    });
  });
});
