import * as adminService from "../../../../apps/backend/src/modules/admin/admin.service.js";
import * as adminRepository from "../../../../apps/backend/src/modules/admin/admin.repository.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import type {
  FeedReport,
  ModerateReportInput,
  UserSearchResult,
  UserActionInput,
  ListReportsQuery,
  SearchUsersQuery,
} from "../../../../apps/backend/src/modules/admin/admin.types.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/admin/admin.repository.js");
jest.mock("../../../../apps/backend/src/modules/common/audit.util.js", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

const mockAdminRepo = jest.mocked(adminRepository);

describe("Admin Service", () => {
  const adminId = "admin-123";
  const reportId = "report-123";
  const feedItemId = "feed-item-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listReports", () => {
    it("should return list of reports", async () => {
      const query: ListReportsQuery = {
        status: "pending",
        limit: 10,
      };

      const mockReports: FeedReport[] = [
        {
          id: reportId,
          feedItemId,
          reason: "spam",
          status: "pending",
          reportedAt: new Date().toISOString(),
          contentAuthor: "testuser",
        },
      ];

      mockAdminRepo.listFeedReports.mockResolvedValue(mockReports);

      const result = await adminService.listReports(query);

      expect(result).toEqual(mockReports);
      expect(mockAdminRepo.listFeedReports).toHaveBeenCalledWith(query);
    });
  });

  describe("moderateReport", () => {
    const mockReport: FeedReport = {
      id: reportId,
      feedItemId,
      reason: "spam",
      status: "pending",
      reportedAt: new Date().toISOString(),
      contentAuthor: "testuser",
    };

    it("should dismiss a report", async () => {
      const input: ModerateReportInput = {
        reportId,
        action: "dismiss",
        adminId,
      };

      mockAdminRepo.getFeedReportById.mockResolvedValue(mockReport);
      mockAdminRepo.updateReportStatus.mockResolvedValue(undefined);

      await adminService.moderateReport(input);

      expect(mockAdminRepo.updateReportStatus).toHaveBeenCalledWith(reportId, "dismissed", adminId);
    });

    it("should hide feed item when action is hide", async () => {
      const input: ModerateReportInput = {
        reportId,
        action: "hide",
        adminId,
      };

      mockAdminRepo.getFeedReportById.mockResolvedValue(mockReport);
      mockAdminRepo.hideFeedItem.mockResolvedValue(undefined);
      mockAdminRepo.updateReportStatus.mockResolvedValue(undefined);

      await adminService.moderateReport(input);

      expect(mockAdminRepo.hideFeedItem).toHaveBeenCalledWith(feedItemId);
      expect(mockAdminRepo.updateReportStatus).toHaveBeenCalledWith(reportId, "reviewed", adminId);
    });

    it("should throw 404 when report not found", async () => {
      mockAdminRepo.getFeedReportById.mockResolvedValue(null);

      await expect(
        adminService.moderateReport({ reportId, action: "dismiss", adminId }),
      ).rejects.toThrow(HttpError);
    });

    it("should throw error when report already resolved", async () => {
      const resolvedReport: FeedReport = {
        ...mockReport,
        status: "dismissed",
      };

      mockAdminRepo.getFeedReportById.mockResolvedValue(resolvedReport);

      await expect(
        adminService.moderateReport({ reportId, action: "dismiss", adminId }),
      ).rejects.toThrow(HttpError);
      await expect(
        adminService.moderateReport({ reportId, action: "dismiss", adminId }),
      ).rejects.toThrow("REPORT_ALREADY_RESOLVED");
    });
  });

  describe("searchUsersService", () => {
    it("should search users", async () => {
      const query: SearchUsersQuery = {
        query: "testuser",
        limit: 10,
      };

      const mockUsers: UserSearchResult[] = [
        {
          id: "user-123",
          username: "testuser",
          displayName: "Test User",
          email: "test@example.com",
          status: "active",
          role: "athlete",
        },
      ];

      mockAdminRepo.searchUsers.mockResolvedValue(mockUsers);

      const result = await adminService.searchUsersService(query);

      expect(result).toEqual(mockUsers);
      expect(mockAdminRepo.searchUsers).toHaveBeenCalledWith(query);
    });
  });

  describe("performUserAction", () => {
    it("should update user status", async () => {
      const input: UserActionInput = {
        userId: "user-123",
        action: "suspend",
        adminId,
      };

      mockAdminRepo.updateUserStatus.mockResolvedValue(undefined);

      await adminService.performUserAction(input);

      expect(mockAdminRepo.updateUserStatus).toHaveBeenCalledWith("user-123", "suspended");
    });

    it("should throw error for invalid action", async () => {
      const input: UserActionInput = {
        userId: "user-123",
        action: "invalid" as never,
        adminId,
      };

      await expect(adminService.performUserAction(input)).rejects.toThrow(HttpError);
    });
  });
});
