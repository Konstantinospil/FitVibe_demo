/**
 * Unit tests for admin service
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import * as service from "../../../../apps/backend/src/modules/admin/admin.service.js";
import * as repo from "../../../../apps/backend/src/modules/admin/admin.repository.js";
import * as audit from "../../../../apps/backend/src/modules/common/audit.util.js";
import type {
  FeedReport,
  UserSearchResult,
  ModerateReportInput,
  UserActionInput,
} from "../../../../apps/backend/src/modules/admin/admin.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/admin/admin.repository.js");
jest.mock("../../../../apps/backend/src/modules/common/audit.util.js", () => ({
  insertAudit: jest.fn(),
  logAudit: jest.fn(),
}));

describe("Admin Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listReports", () => {
    it("should list reports", async () => {
      const mockReports: FeedReport[] = [
        {
          id: "report-1",
          reporterId: "user-1",
          reporterUsername: "reporter",
          feedItemId: "item-1",
          commentId: null,
          reason: "spam",
          details: null,
          status: "pending",
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
          contentPreview: "test content",
          contentAuthor: "author",
        },
      ];

      jest.mocked(repo.listFeedReports).mockResolvedValue(mockReports);

      const result = await service.listReports({ status: "pending", limit: 10 });

      expect(result).toEqual(mockReports);
      expect(repo.listFeedReports).toHaveBeenCalledWith({ status: "pending", limit: 10 });
    });
  });

  describe("moderateReport", () => {
    it("should dismiss report successfully", async () => {
      const mockReport: FeedReport = {
        id: "report-1",
        reporterId: "user-1",
        reporterUsername: "reporter",
        feedItemId: null,
        commentId: null,
        reason: "spam",
        details: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        contentPreview: "test",
        contentAuthor: "author",
      };

      jest.mocked(repo.getFeedReportById).mockResolvedValue(mockReport);
      jest.mocked(repo.updateReportStatus).mockResolvedValue();

      const input: ModerateReportInput = {
        reportId: "report-1",
        action: "dismiss",
        adminId: "admin-1",
      };

      await service.moderateReport(input);

      expect(repo.updateReportStatus).toHaveBeenCalledWith("report-1", "dismissed", "admin-1");
      expect(audit.logAudit).toHaveBeenCalledWith({
        action: "report_dismissed",
        entityType: "feed_report",
        entityId: "report-1",
        userId: "admin-1",
        metadata: { reportId: "report-1", reason: "spam" },
      });
    });

    it("should throw error if report not found", async () => {
      jest.mocked(repo.getFeedReportById).mockResolvedValue(null);

      const input: ModerateReportInput = {
        reportId: "report-1",
        action: "dismiss",
        adminId: "admin-1",
      };

      await expect(service.moderateReport(input)).rejects.toThrow(HttpError);
      expect(repo.updateReportStatus).not.toHaveBeenCalled();
    });

    it("should throw error if report already resolved", async () => {
      const mockReport: FeedReport = {
        id: "report-1",
        reporterId: "user-1",
        reporterUsername: "reporter",
        feedItemId: null,
        commentId: null,
        reason: "spam",
        details: null,
        status: "reviewed",
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        resolvedBy: "admin-1",
        contentPreview: "test",
        contentAuthor: "author",
      };

      jest.mocked(repo.getFeedReportById).mockResolvedValue(mockReport);

      const input: ModerateReportInput = {
        reportId: "report-1",
        action: "dismiss",
        adminId: "admin-1",
      };

      await expect(service.moderateReport(input)).rejects.toThrow(HttpError);
    });

    it("should hide feed item successfully", async () => {
      const mockReport: FeedReport = {
        id: "report-1",
        reporterId: "user-1",
        reporterUsername: "reporter",
        feedItemId: "item-1",
        commentId: null,
        reason: "spam",
        details: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        contentPreview: "test",
        contentAuthor: "author",
      };

      jest.mocked(repo.getFeedReportById).mockResolvedValue(mockReport);
      jest.mocked(repo.hideFeedItem).mockResolvedValue();
      jest.mocked(repo.updateReportStatus).mockResolvedValue();

      const input: ModerateReportInput = {
        reportId: "report-1",
        action: "hide",
        adminId: "admin-1",
      };

      await service.moderateReport(input);

      expect(repo.hideFeedItem).toHaveBeenCalledWith("item-1");
      expect(repo.updateReportStatus).toHaveBeenCalledWith("report-1", "reviewed", "admin-1");
      expect(audit.logAudit).toHaveBeenCalledWith({
        action: "content_hidden",
        entityType: "feed_item",
        entityId: "item-1",
        userId: "admin-1",
        metadata: { reportId: "report-1", action: "hide" },
      });
    });

    it("should hide comment successfully", async () => {
      const mockReport: FeedReport = {
        id: "report-1",
        reporterId: "user-1",
        reporterUsername: "reporter",
        feedItemId: null,
        commentId: "comment-1",
        reason: "spam",
        details: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        contentPreview: "test",
        contentAuthor: "author",
      };

      jest.mocked(repo.getFeedReportById).mockResolvedValue(mockReport);
      jest.mocked(repo.hideComment).mockResolvedValue();
      jest.mocked(repo.updateReportStatus).mockResolvedValue();

      const input: ModerateReportInput = {
        reportId: "report-1",
        action: "hide",
        adminId: "admin-1",
      };

      await service.moderateReport(input);

      expect(repo.hideComment).toHaveBeenCalledWith("comment-1");
      expect(repo.updateReportStatus).toHaveBeenCalledWith("report-1", "reviewed", "admin-1");
    });

    it("should ban user and hide content successfully", async () => {
      const mockReport: FeedReport = {
        id: "report-1",
        reporterId: "user-1",
        reporterUsername: "reporter",
        feedItemId: "item-1",
        commentId: null,
        reason: "spam",
        details: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        contentPreview: "test",
        contentAuthor: "author",
      };

      const mockUser: UserSearchResult = {
        id: "user-2",
        username: "author",
        email: "author@example.com",
        roleCode: "user",
        status: "active",
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        sessionCount: 5,
        reportCount: 1,
      };

      jest.mocked(repo.getFeedReportById).mockResolvedValue(mockReport);
      jest.mocked(repo.searchUsers).mockResolvedValue([mockUser]);
      jest.mocked(repo.updateUserStatus).mockResolvedValue();
      jest.mocked(repo.hideFeedItem).mockResolvedValue();
      jest.mocked(repo.updateReportStatus).mockResolvedValue();

      const input: ModerateReportInput = {
        reportId: "report-1",
        action: "ban",
        adminId: "admin-1",
      };

      await service.moderateReport(input);

      expect(repo.searchUsers).toHaveBeenCalledWith({ query: "author", limit: 1 });
      expect(repo.updateUserStatus).toHaveBeenCalledWith("user-2", "banned");
      expect(repo.hideFeedItem).toHaveBeenCalledWith("item-1");
      expect(audit.logAudit).toHaveBeenCalledWith({
        action: "user_banned",
        entityType: "user",
        entityId: "author",
        userId: "admin-1",
        metadata: { reportId: "report-1", action: "ban", reason: "spam" },
      });
    });
  });

  describe("searchUsersService", () => {
    it("should search users successfully", async () => {
      const mockUsers: UserSearchResult[] = [
        {
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          roleCode: "user",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          sessionCount: 10,
          reportCount: 0,
        },
      ];

      jest.mocked(repo.searchUsers).mockResolvedValue(mockUsers);

      const result = await service.searchUsersService({ query: "test", limit: 10 });

      expect(result).toEqual(mockUsers);
      expect(repo.searchUsers).toHaveBeenCalledWith({ query: "test", limit: 10 });
    });

    it("should throw error if query is empty", async () => {
      await expect(service.searchUsersService({ query: "", limit: 10 })).rejects.toThrow(HttpError);

      await expect(service.searchUsersService({ query: "   ", limit: 10 })).rejects.toThrow(
        HttpError,
      );

      expect(repo.searchUsers).not.toHaveBeenCalled();
    });
  });

  describe("performUserAction", () => {
    const mockUser: UserSearchResult = {
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      roleCode: "user",
      status: "active",
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      sessionCount: 10,
      reportCount: 0,
    };

    it("should blacklist user successfully", async () => {
      jest.mocked(repo.getUserForAdmin).mockResolvedValue(mockUser);
      jest.mocked(repo.addToBlacklist).mockResolvedValue();
      jest.mocked(repo.updateUserStatus).mockResolvedValue();
      jest.mocked(repo.updateUserDeactivatedAt).mockResolvedValue();

      const input: UserActionInput = {
        userId: "user-1",
        action: "blacklist",
        adminId: "admin-1",
        reason: "Violation",
      };

      await service.performUserAction(input);

      expect(repo.addToBlacklist).toHaveBeenCalledWith("test@example.com", "admin-1");
      expect(repo.updateUserStatus).toHaveBeenCalledWith("user-1", "banned");
      expect(repo.updateUserDeactivatedAt).toHaveBeenCalledWith("user-1", expect.any(Date));
      expect(audit.logAudit).toHaveBeenCalledWith({
        action: "user_blacklisted",
        entityType: "user",
        entityId: "user-1",
        userId: "admin-1",
        metadata: { username: "testuser", email: "test@example.com", reason: "Violation" },
      });
    });

    it("should throw error if user not found", async () => {
      jest.mocked(repo.getUserForAdmin).mockResolvedValue(null);

      const input: UserActionInput = {
        userId: "user-1",
        action: "blacklist",
        adminId: "admin-1",
      };

      await expect(service.performUserAction(input)).rejects.toThrow(HttpError);
      expect(repo.updateUserStatus).not.toHaveBeenCalled();
    });

    it("should throw error if admin tries to modify themselves", async () => {
      jest.mocked(repo.getUserForAdmin).mockResolvedValue(mockUser);

      const input: UserActionInput = {
        userId: "admin-1",
        action: "blacklist",
        adminId: "admin-1",
      };

      await expect(service.performUserAction(input)).rejects.toThrow(HttpError);
      expect(repo.updateUserStatus).not.toHaveBeenCalled();
    });

    it("should allow actions against another admin user", async () => {
      const adminUser: UserSearchResult = {
        ...mockUser,
        roleCode: "admin",
      };

      jest.mocked(repo.getUserForAdmin).mockResolvedValue(adminUser);
      jest.mocked(repo.addToBlacklist).mockResolvedValue();
      jest.mocked(repo.updateUserStatus).mockResolvedValue();
      jest.mocked(repo.updateUserDeactivatedAt).mockResolvedValue();

      const input: UserActionInput = {
        userId: "user-1",
        action: "blacklist",
        adminId: "admin-2",
      };

      await expect(service.performUserAction(input)).resolves.toBeUndefined();
      expect(repo.updateUserStatus).toHaveBeenCalledWith("user-1", "banned");
    });

    it("should unblacklist user successfully", async () => {
      jest.mocked(repo.getUserForAdmin).mockResolvedValue(mockUser);
      jest.mocked(repo.removeFromBlacklist).mockResolvedValue();
      jest.mocked(repo.updateUserStatus).mockResolvedValue();
      jest.mocked(repo.updateUserDeactivatedAt).mockResolvedValue();

      const input: UserActionInput = {
        userId: "user-1",
        action: "unblacklist",
        adminId: "admin-1",
      };

      await service.performUserAction(input);

      expect(repo.removeFromBlacklist).toHaveBeenCalledWith("test@example.com");
      expect(repo.updateUserStatus).toHaveBeenCalledWith("user-1", "active");
      expect(repo.updateUserDeactivatedAt).toHaveBeenCalledWith("user-1", null);
      expect(audit.logAudit).toHaveBeenCalledWith({
        action: "user_unblacklisted",
        entityType: "user",
        entityId: "user-1",
        userId: "admin-1",
        metadata: { username: "testuser", email: "test@example.com", reason: undefined },
      });
    });

    it("should delete user successfully", async () => {
      jest.mocked(repo.getUserForAdmin).mockResolvedValue(mockUser);
      jest.mocked(repo.softDeleteUser).mockResolvedValue();

      const input: UserActionInput = {
        userId: "user-1",
        action: "delete",
        adminId: "admin-1",
      };

      await service.performUserAction(input);

      expect(repo.softDeleteUser).toHaveBeenCalledWith("user-1");
      expect(audit.logAudit).toHaveBeenCalledWith({
        action: "user_deleted",
        entityType: "user",
        entityId: "user-1",
        userId: "admin-1",
        metadata: { username: "testuser", reason: undefined },
      });
    });
  });
});
