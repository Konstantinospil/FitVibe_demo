/**
 * Unit tests for admin repository
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as repo from "../../../../apps/backend/src/modules/admin/admin.repository.js";
import { db } from "../../../../apps/backend/src/db/index.js";
import type {
  FeedReport,
  UserSearchResult,
} from "../../../../apps/backend/src/modules/admin/admin.types.js";

// Mock the database
jest.mock("../../../../apps/backend/src/db/index.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add fn and raw helpers to mock db (must be done before beforeEach)
(mockDb as unknown as { fn: { now: jest.Mock }; raw: jest.Mock }).fn = {
  now: jest.fn().mockReturnValue("NOW()"),
};
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

describe("Admin Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const createQueryBuilder = () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined),
      };
      // Make update return a promise that resolves to maintain chain
      builder.update.mockResolvedValue(1);
      return builder;
    };

    // Default: db() returns a new mock query builder instance
    mockDb.mockImplementation(() => createQueryBuilder() as never);
  });

  describe("listFeedReports", () => {
    it("should list feed reports with default status", async () => {
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
          contentPreview: "test",
          contentAuthor: "author",
        },
      ];

      const createChainableBuilder = () => {
        const builder: {
          select: jest.Mock;
          leftJoin: jest.Mock;
          where: jest.Mock;
          orderBy: jest.Mock;
          limit: jest.Mock;
          offset: jest.Mock;
          then: jest.Mock;
        } = {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          then: jest.fn(
            (resolve: (value: FeedReport[]) => FeedReport[] | PromiseLike<FeedReport[]>) =>
              Promise.resolve(mockReports).then(resolve),
          ),
        };
        // Make the builder awaitable by implementing then
        return builder;
      };

      const queryBuilder = createChainableBuilder();
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.listFeedReports({ status: "pending", limit: 10, offset: 0 });

      expect(result).toEqual(mockReports);
      expect(mockDb).toHaveBeenCalledWith("feed_reports as fr");
      expect(queryBuilder.where).toHaveBeenCalledWith("fr.status", "pending");
    });

    it("should handle all status filter", async () => {
      const mockReports: FeedReport[] = [];
      const queryBuilder: {
        select: jest.Mock;
        leftJoin: jest.Mock;
        where: jest.Mock;
        orderBy: jest.Mock;
        limit: jest.Mock;
        offset: jest.Mock;
        then: jest.Mock;
      } = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn(
          (resolve: (value: FeedReport[]) => FeedReport[] | PromiseLike<FeedReport[]>) =>
            Promise.resolve(mockReports).then(resolve),
        ),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.listFeedReports({ status: "all", limit: 10, offset: 0 });

      expect(result).toEqual(mockReports);
      // Should not call where when status is "all"
      expect(queryBuilder.where).not.toHaveBeenCalledWith("fr.status", "all");
    });

    it("should list feed reports with dismissed status", async () => {
      const mockReports: FeedReport[] = [
        {
          id: "report-2",
          reporterId: "user-2",
          reporterUsername: "reporter2",
          feedItemId: "item-2",
          commentId: null,
          reason: "inappropriate",
          details: null,
          status: "dismissed",
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          resolvedBy: "admin-1",
          contentPreview: "test content",
          contentAuthor: "author2",
        },
      ];

      const createChainableBuilder = () => {
        const builder: {
          select: jest.Mock;
          leftJoin: jest.Mock;
          where: jest.Mock;
          orderBy: jest.Mock;
          limit: jest.Mock;
          offset: jest.Mock;
          then: jest.Mock;
        } = {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          then: jest.fn(
            (resolve: (value: FeedReport[]) => FeedReport[] | PromiseLike<FeedReport[]>) =>
              Promise.resolve(mockReports).then(resolve),
          ),
        };
        return builder;
      };

      const queryBuilder = createChainableBuilder();
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.listFeedReports({ status: "dismissed", limit: 10, offset: 0 });

      expect(result).toEqual(mockReports);
      expect(mockDb).toHaveBeenCalledWith("feed_reports as fr");
      expect(queryBuilder.where).toHaveBeenCalledWith("fr.status", "dismissed");
    });

    it("should list feed reports with reviewed status", async () => {
      const mockReports: FeedReport[] = [
        {
          id: "report-3",
          reporterId: "user-3",
          reporterUsername: "reporter3",
          feedItemId: "item-3",
          commentId: null,
          reason: "harassment",
          details: "Details here",
          status: "reviewed",
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          resolvedBy: "admin-2",
          contentPreview: "reviewed content",
          contentAuthor: "author3",
        },
      ];

      const createChainableBuilder = () => {
        const builder: {
          select: jest.Mock;
          leftJoin: jest.Mock;
          where: jest.Mock;
          orderBy: jest.Mock;
          limit: jest.Mock;
          offset: jest.Mock;
          then: jest.Mock;
        } = {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          then: jest.fn(
            (resolve: (value: FeedReport[]) => FeedReport[] | PromiseLike<FeedReport[]>) =>
              Promise.resolve(mockReports).then(resolve),
          ),
        };
        return builder;
      };

      const queryBuilder = createChainableBuilder();
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.listFeedReports({ status: "reviewed", limit: 10, offset: 0 });

      expect(result).toEqual(mockReports);
      expect(mockDb).toHaveBeenCalledWith("feed_reports as fr");
      expect(queryBuilder.where).toHaveBeenCalledWith("fr.status", "reviewed");
    });
  });

  describe("getFeedReportById", () => {
    it("should get feed report by id", async () => {
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

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockReport),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.getFeedReportById("report-1");

      expect(result).toEqual(mockReport);
      expect(queryBuilder.where).toHaveBeenCalledWith("fr.id", "report-1");
    });

    it("should return null if report not found", async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.getFeedReportById("report-1");

      expect(result).toBeNull();
    });
  });

  describe("updateReportStatus", () => {
    it("should update report status to dismissed", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.updateReportStatus("report-1", "dismissed", "admin-1");

      expect(mockDb).toHaveBeenCalledWith("feed_reports");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "report-1");
      expect(updateBuilder.update).toHaveBeenCalledWith({
        status: "dismissed",
        resolved_at: "NOW()",
        resolved_by: "admin-1",
      });
    });

    it("should update report status to reviewed", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.updateReportStatus("report-2", "reviewed", "admin-2");

      expect(mockDb).toHaveBeenCalledWith("feed_reports");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "report-2");
      expect(updateBuilder.update).toHaveBeenCalledWith({
        status: "reviewed",
        resolved_at: "NOW()",
        resolved_by: "admin-2",
      });
    });
  });

  describe("hideFeedItem", () => {
    it("should hide feed item", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.hideFeedItem("item-1");

      expect(mockDb).toHaveBeenCalledWith("feed_items");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "item-1");
      expect(updateBuilder.update).toHaveBeenCalledWith({ visibility: "private" });
    });
  });

  describe("hideComment", () => {
    it("should hide comment", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.hideComment("comment-1");

      expect(mockDb).toHaveBeenCalledWith("feed_comments");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "comment-1");
      expect(updateBuilder.update).toHaveBeenCalledWith({
        deleted_at: "NOW()",
      });
    });
  });

  describe("searchUsers", () => {
    it("should search users by email", async () => {
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

      const queryBuilder: {
        select: jest.Mock;
        where: jest.Mock;
        whereNull: jest.Mock;
        orderBy: jest.Mock;
        limit: jest.Mock;
        offset: jest.Mock;
        then: jest.Mock;
      } = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn(
          (
            resolve: (
              value: UserSearchResult[],
            ) => UserSearchResult[] | PromiseLike<UserSearchResult[]>,
          ) => Promise.resolve(mockUsers).then(resolve),
        ),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.searchUsers({ query: "test@example.com", limit: 10, offset: 0 });

      expect(result).toEqual(mockUsers);
      expect(mockDb).toHaveBeenCalledWith("users as u");
      expect(queryBuilder.where).toHaveBeenCalled();
    });

    it("should search users by username", async () => {
      const mockUsers: UserSearchResult[] = [
        {
          id: "user-2",
          username: "johndoe",
          email: "john@example.com",
          roleCode: "user",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          sessionCount: 5,
          reportCount: 2,
        },
      ];

      const queryBuilder: {
        select: jest.Mock;
        where: jest.Mock;
        whereNull: jest.Mock;
        orderBy: jest.Mock;
        limit: jest.Mock;
        offset: jest.Mock;
        then: jest.Mock;
      } = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn(
          (
            resolve: (
              value: UserSearchResult[],
            ) => UserSearchResult[] | PromiseLike<UserSearchResult[]>,
          ) => Promise.resolve(mockUsers).then(resolve),
        ),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.searchUsers({ query: "johndoe", limit: 10, offset: 0 });

      expect(result).toEqual(mockUsers);
      expect(mockDb).toHaveBeenCalledWith("users as u");
      expect(queryBuilder.where).toHaveBeenCalled();
    });

    it("should search users by ID", async () => {
      const mockUsers: UserSearchResult[] = [
        {
          id: "user-3",
          username: "janedoe",
          email: "jane@example.com",
          roleCode: "user",
          status: "active",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          sessionCount: 20,
          reportCount: 0,
        },
      ];

      const queryBuilder: {
        select: jest.Mock;
        where: jest.Mock;
        whereNull: jest.Mock;
        orderBy: jest.Mock;
        limit: jest.Mock;
        offset: jest.Mock;
        then: jest.Mock;
      } = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn(
          (
            resolve: (
              value: UserSearchResult[],
            ) => UserSearchResult[] | PromiseLike<UserSearchResult[]>,
          ) => Promise.resolve(mockUsers).then(resolve),
        ),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.searchUsers({ query: "user-3", limit: 10, offset: 0 });

      expect(result).toEqual(mockUsers);
      expect(mockDb).toHaveBeenCalledWith("users as u");
      expect(queryBuilder.where).toHaveBeenCalled();
    });
  });

  describe("updateUserStatus", () => {
    it("should update user status to banned", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.updateUserStatus("user-1", "banned");

      expect(mockDb).toHaveBeenCalledWith("users");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "user-1");
      expect(updateBuilder.update).toHaveBeenCalledWith({ status: "banned" });
    });

    it("should update user status to active", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.updateUserStatus("user-2", "active");

      expect(mockDb).toHaveBeenCalledWith("users");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "user-2");
      expect(updateBuilder.update).toHaveBeenCalledWith({ status: "active" });
    });

    it("should update user status to suspended", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.updateUserStatus("user-3", "suspended");

      expect(mockDb).toHaveBeenCalledWith("users");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "user-3");
      expect(updateBuilder.update).toHaveBeenCalledWith({ status: "suspended" });
    });
  });

  describe("softDeleteUser", () => {
    it("should soft delete user", async () => {
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder as never);

      await repo.softDeleteUser("user-1");

      expect(mockDb).toHaveBeenCalledWith("users");
      expect(updateBuilder.where).toHaveBeenCalledWith("id", "user-1");
      expect(updateBuilder.update).toHaveBeenCalledWith({
        deleted_at: "NOW()",
        status: "banned",
      });
    });
  });

  describe("getUserForAdmin", () => {
    it("should get user for admin", async () => {
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

      // Need to recreate query builder for this test to handle select with raw
      const newQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      };
      mockDb.mockReturnValueOnce(newQueryBuilder as never);

      const result = await repo.getUserForAdmin("user-1");

      expect(result).toEqual(mockUser);
      expect(newQueryBuilder.where).toHaveBeenCalledWith("u.id", "user-1");
    });

    it("should return null if user not found", async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.mockReturnValueOnce(queryBuilder as never);

      const result = await repo.getUserForAdmin("user-1");

      expect(result).toBeNull();
    });
  });
});
