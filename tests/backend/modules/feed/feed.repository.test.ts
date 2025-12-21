import { db } from "../../../../apps/backend/src/db/connection.js";
import * as feedRepository from "../../../../apps/backend/src/modules/feed/feed.repository.js";

// Mock the database connection
jest.mock("../../../../apps/backend/src/db/connection.js", () => ({
  db: jest.fn(),
}));

const mockDb = jest.mocked(db);

// Add fn and raw helpers to mock db
(mockDb as unknown as { fn: { now: jest.Mock }; raw: jest.Mock }).fn = {
  now: jest.fn().mockReturnValue("NOW()"),
};
(mockDb as unknown as { raw: jest.Mock }).raw = jest.fn((sql: string) => sql);

describe("Feed Repository", () => {
  let mockQueryBuilder: {
    select: jest.Mock;
    where: jest.Mock;
    whereIn: jest.Mock;
    whereNotIn: jest.Mock;
    whereNull: jest.Mock;
    whereNotNull: jest.Mock;
    whereNotExists: jest.Mock;
    whereRaw: jest.Mock;
    andWhere: jest.Mock;
    orWhere: jest.Mock;
    join: jest.Mock;
    leftJoin: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    groupBy: jest.Mock;
    first: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    del: jest.Mock;
    returning: jest.Mock;
    onConflict: jest.Mock;
    ignore: jest.Mock;
    increment: jest.Mock;
    unionAll: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query builder with chainable methods
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      whereNotIn: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      whereNotNull: jest.fn().mockReturnThis(),
      whereNotExists: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      returning: jest.fn().mockResolvedValue([]),
      onConflict: jest.fn().mockReturnThis(),
      ignore: jest.fn().mockResolvedValue([]),
      increment: jest.fn().mockResolvedValue(1),
      unionAll: jest.fn().mockReturnThis(),
    };

    // Default: db() returns the mock query builder
    mockDb.mockReturnValue(mockQueryBuilder as never);
  });

  describe("findSessionById", () => {
    it("should find session by id", async () => {
      const mockSession = {
        id: "session-123",
        owner_id: "user-123",
        visibility: "public",
        status: "completed",
        completed_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockSession);

      const result = await feedRepository.findSessionById("session-123");

      expect(result).toEqual(mockSession);
      expect(mockDb).toHaveBeenCalledWith("sessions");
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "session-123" });
    });

    it("should return undefined if session not found", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await feedRepository.findSessionById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("findFeedItemBySessionId", () => {
    it("should find feed item by session id", async () => {
      const mockFeedItem = {
        id: "feed-123",
        owner_id: "user-123",
        session_id: "session-123",
        visibility: "public",
        published_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockFeedItem);

      const result = await feedRepository.findFeedItemBySessionId("session-123");

      expect(result).toEqual(mockFeedItem);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ session_id: "session-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
    });
  });

  describe("insertFeedItem", () => {
    it("should insert feed item and return row", async () => {
      const mockInserted = {
        id: "feed-new",
        owner_id: "user-123",
        session_id: "session-123",
        visibility: "public",
        published_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.returning.mockResolvedValue([mockInserted]);

      const result = await feedRepository.insertFeedItem({
        ownerId: "user-123",
        sessionId: "session-123",
        visibility: "public",
      });

      expect(result).toEqual(mockInserted);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
    });

    it("should handle null session id", async () => {
      const mockInserted = {
        id: "feed-new",
        owner_id: "user-123",
        session_id: null,
        visibility: "private",
        published_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.returning.mockResolvedValue([mockInserted]);

      const result = await feedRepository.insertFeedItem({
        ownerId: "user-123",
        visibility: "private",
      });

      expect(result).toEqual(mockInserted);
    });
  });

  describe("findFeedItemById", () => {
    it("should find feed item by id", async () => {
      const mockItem = {
        id: "feed-123",
        owner_id: "user-123",
        session_id: "session-123",
        visibility: "public",
        published_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockItem);

      const result = await feedRepository.findFeedItemById("feed-123");

      expect(result).toEqual(mockItem);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "feed-123" });
      expect(mockQueryBuilder.whereNull).toHaveBeenCalledWith("deleted_at");
    });
  });

  describe("updateFeedItem", () => {
    it("should update feed item with patch", async () => {
      await feedRepository.updateFeedItem("feed-123", { visibility: "private" });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "feed-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it("should do nothing if patch is empty", async () => {
      await feedRepository.updateFeedItem("feed-123", {});

      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteFollower", () => {
    it("should delete follower relationship", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await feedRepository.deleteFollower("follower-123", "following-123");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        follower_id: "follower-123",
        following_id: "following-123",
      });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });
  });

  describe("upsertFollower", () => {
    it("should insert new follower (array result)", async () => {
      mockQueryBuilder.ignore.mockResolvedValue([{ id: "new" }]);

      const result = await feedRepository.upsertFollower("follower-123", "following-123");

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.onConflict).toHaveBeenCalledWith(["follower_id", "following_id"]);
    });

    it("should return false if no rows inserted (empty array)", async () => {
      mockQueryBuilder.ignore.mockResolvedValue([]);

      const result = await feedRepository.upsertFollower("follower-123", "following-123");

      expect(result).toBe(false);
    });

    it("should handle numeric result", async () => {
      mockQueryBuilder.ignore.mockResolvedValue(1);

      const result = await feedRepository.upsertFollower("follower-123", "following-123");

      expect(result).toBe(true);
    });

    it("should return true for other result types", async () => {
      mockQueryBuilder.ignore.mockResolvedValue({} as never);

      const result = await feedRepository.upsertFollower("follower-123", "following-123");

      expect(result).toBe(true);
    });
  });

  describe("listFollowers", () => {
    it("should list followers for user", async () => {
      const mockFollowers = [
        {
          follower_id: "user-1",
          follower_username: "user1",
          follower_display_name: "User One",
          followed_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock the final promise resolution
      (mockQueryBuilder as unknown as Promise<typeof mockFollowers>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockFollowers);
          return Promise.resolve(mockFollowers);
        }) as never;

      const result = await feedRepository.listFollowers("user-123");

      expect(result).toEqual(mockFollowers);
      expect(mockQueryBuilder.join).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });
  });

  describe("listFollowing", () => {
    it("should list users being followed", async () => {
      const mockFollowing = [
        {
          following_id: "user-1",
          following_username: "user1",
          following_display_name: "User One",
          followed_at: "2024-01-01T00:00:00Z",
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockFollowing>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockFollowing);
          return Promise.resolve(mockFollowing);
        }) as never;

      const result = await feedRepository.listFollowing("user-123");

      expect(result).toEqual(mockFollowing);
    });
  });

  describe("upsertFeedLike", () => {
    it("should upsert feed like (array result)", async () => {
      mockQueryBuilder.ignore.mockResolvedValue([{ id: "like-1" }]);

      const result = await feedRepository.upsertFeedLike("feed-123", "user-123");

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should handle numeric result", async () => {
      mockQueryBuilder.ignore.mockResolvedValue(1);

      const result = await feedRepository.upsertFeedLike("feed-123", "user-123");

      expect(result).toBe(true);
    });
  });

  describe("deleteFeedLike", () => {
    it("should delete feed like", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await feedRepository.deleteFeedLike("feed-123", "user-123");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        feed_item_id: "feed-123",
        user_id: "user-123",
      });
    });
  });

  describe("getFeedItemStats", () => {
    it("should return empty map for empty input", async () => {
      const result = await feedRepository.getFeedItemStats([]);

      expect(result.size).toBe(0);
      expect(mockDb).not.toHaveBeenCalled();
    });

    it("should aggregate likes and comments", async () => {
      const feedItemIds = ["feed-1", "feed-2"];

      const mockLikes = [
        { feed_item_id: "feed-1", count: "5" },
        { feed_item_id: "feed-2", count: 3 },
      ];

      const mockComments = [
        { feed_item_id: "feed-1", count: "2" },
        { feed_item_id: "feed-2", count: 1 },
      ];

      // Mock two separate db calls
      mockDb
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          then: jest.fn().mockImplementation((resolve) => {
            resolve(mockLikes);
            return Promise.resolve(mockLikes);
          }),
        } as never)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          then: jest.fn().mockImplementation((resolve) => {
            resolve(mockComments);
            return Promise.resolve(mockComments);
          }),
        } as never);

      const result = await feedRepository.getFeedItemStats(feedItemIds);

      expect(result.size).toBe(2);
      expect(result.get("feed-1")).toEqual({ likes: 5, comments: 2 });
      expect(result.get("feed-2")).toEqual({ likes: 3, comments: 1 });
    });
  });

  describe("findUserLikedFeedItems", () => {
    it("should return empty set if no user id", async () => {
      const result = await feedRepository.findUserLikedFeedItems("", ["feed-1"]);

      expect(result.size).toBe(0);
    });

    it("should return empty set if no feed item ids", async () => {
      const result = await feedRepository.findUserLikedFeedItems("user-123", []);

      expect(result.size).toBe(0);
    });

    it("should return set of liked feed item ids", async () => {
      const mockLikes = [{ feed_item_id: "feed-1" }, { feed_item_id: "feed-2" }];

      (mockQueryBuilder as unknown as Promise<typeof mockLikes>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockLikes);
          return Promise.resolve(mockLikes);
        }) as never;

      const result = await feedRepository.findUserLikedFeedItems("user-123", [
        "feed-1",
        "feed-2",
        "feed-3",
      ]);

      expect(result.size).toBe(2);
      expect(result.has("feed-1")).toBe(true);
      expect(result.has("feed-2")).toBe(true);
      expect(result.has("feed-3")).toBe(false);
    });
  });

  describe("upsertBookmark", () => {
    it("should upsert bookmark", async () => {
      mockQueryBuilder.ignore.mockResolvedValue([{ id: "bookmark-1" }]);

      const result = await feedRepository.upsertBookmark("session-123", "user-123");

      expect(result).toBe(true);
    });
  });

  describe("deleteBookmark", () => {
    it("should delete bookmark", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await feedRepository.deleteBookmark("session-123", "user-123");

      expect(result).toBe(1);
    });
  });

  describe("findUserBookmarkedSessions", () => {
    it("should return empty set if no user", async () => {
      const result = await feedRepository.findUserBookmarkedSessions("", ["session-1"]);

      expect(result.size).toBe(0);
    });

    it("should return set of bookmarked session ids", async () => {
      const mockBookmarks = [{ session_id: "session-1" }, { session_id: "session-2" }];

      (mockQueryBuilder as unknown as Promise<typeof mockBookmarks>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockBookmarks);
          return Promise.resolve(mockBookmarks);
        }) as never;

      const result = await feedRepository.findUserBookmarkedSessions("user-123", [
        "session-1",
        "session-2",
        "session-3",
      ]);

      expect(result.size).toBe(2);
      expect(result.has("session-1")).toBe(true);
      expect(result.has("session-2")).toBe(true);
    });
  });

  describe("insertComment", () => {
    it("should insert comment and return row", async () => {
      const mockComment = {
        id: "comment-new",
        feed_item_id: "feed-123",
        user_id: "user-123",
        body: "Great workout!",
        created_at: "2024-01-01T00:00:00Z",
        edited_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockComment]);

      const result = await feedRepository.insertComment({
        feedItemId: "feed-123",
        userId: "user-123",
        body: "Great workout!",
      });

      expect(result).toEqual(mockComment);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should handle parent id", async () => {
      const mockComment = {
        id: "comment-reply",
        feed_item_id: "feed-123",
        user_id: "user-123",
        body: "Reply",
        created_at: "2024-01-01T00:00:00Z",
        edited_at: null,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockComment]);

      await feedRepository.insertComment({
        feedItemId: "feed-123",
        userId: "user-123",
        body: "Reply",
        parentId: "comment-parent",
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("findCommentById", () => {
    it("should find comment by id", async () => {
      const mockComment = {
        id: "comment-123",
        feed_item_id: "feed-123",
        user_id: "user-123",
        body: "Comment",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockQueryBuilder.first.mockResolvedValue(mockComment);

      const result = await feedRepository.findCommentById("comment-123");

      expect(result).toEqual(mockComment);
    });
  });

  describe("getCommentWithAuthor", () => {
    it("should get comment with author info", async () => {
      const mockComment = {
        id: "comment-123",
        feed_item_id: "feed-123",
        user_id: "user-123",
        username: "testuser",
        display_name: "Test User",
        body: "Comment",
        created_at: "2024-01-01T00:00:00Z",
        edited_at: null,
      };

      mockQueryBuilder.first.mockResolvedValue(mockComment);

      const result = await feedRepository.getCommentWithAuthor("comment-123");

      expect(result).toEqual(mockComment);
      expect(mockQueryBuilder.join).toHaveBeenCalled();
    });
  });

  describe("softDeleteComment", () => {
    it("should soft delete comment", async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const result = await feedRepository.softDeleteComment("comment-123");

      expect(result).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: "comment-123" });
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });

  describe("hasBlockRelation", () => {
    it("should return true if block exists", async () => {
      mockQueryBuilder.first.mockResolvedValue({ blocker_id: "user-1", blocked_id: "user-2" });

      const result = await feedRepository.hasBlockRelation("user-1", "user-2");

      expect(result).toBe(true);
    });

    it("should return false if no block exists", async () => {
      mockQueryBuilder.first.mockResolvedValue(undefined);

      const result = await feedRepository.hasBlockRelation("user-1", "user-2");

      expect(result).toBe(false);
    });
  });

  describe("insertBlock", () => {
    it("should insert block", async () => {
      mockQueryBuilder.ignore.mockResolvedValue([{ id: "block-1" }]);

      const result = await feedRepository.insertBlock("blocker-123", "blocked-123");

      expect(result).toBe(true);
    });
  });

  describe("deleteBlock", () => {
    it("should delete block", async () => {
      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await feedRepository.deleteBlock("blocker-123", "blocked-123");

      expect(result).toBe(1);
    });
  });

  describe("insertFeedReport", () => {
    it("should insert feed item report", async () => {
      await feedRepository.insertFeedReport({
        reporterId: "user-123",
        feedItemId: "feed-123",
        reason: "spam",
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });

    it("should insert comment report", async () => {
      await feedRepository.insertFeedReport({
        reporterId: "user-123",
        commentId: "comment-123",
        reason: "harassment",
        details: "Additional details",
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("listFeedSessions", () => {
    it("should list public feed", async () => {
      const mockFeedItems = [
        {
          feed_item_id: "feed-1",
          owner_id: "user-1",
          owner_username: "user1",
          owner_display_name: "User One",
          visibility: "public",
          published_at: "2024-01-01T00:00:00Z",
          session_id: "session-1",
          session_title: "Workout 1",
          session_completed_at: "2024-01-01T00:00:00Z",
          session_points: 100,
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockFeedItems>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockFeedItems);
          return Promise.resolve(mockFeedItems);
        }) as never;

      const result = await feedRepository.listFeedSessions({ scope: "public", limit: 20 });

      expect(result).toEqual(mockFeedItems);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("feed_items.visibility", "public");
    });

    it("should return empty array for 'me' scope without viewer", async () => {
      const result = await feedRepository.listFeedSessions({ scope: "me" });

      expect(result).toEqual([]);
    });

    it("should return empty array for 'following' scope without viewer", async () => {
      const result = await feedRepository.listFeedSessions({ scope: "following" });

      expect(result).toEqual([]);
    });

    it("should filter by viewer for 'me' scope", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await feedRepository.listFeedSessions({ scope: "me", viewerId: "user-123" });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith("feed_items.owner_id", "user-123");
    });

    it("should use pagination parameters", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await feedRepository.listFeedSessions({ scope: "public", limit: 10, offset: 20 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20);
    });
  });

  describe("listBookmarkedSessions", () => {
    it("should list bookmarked sessions", async () => {
      const mockBookmarks = [
        {
          session_id: "session-1",
          feed_item_id: "feed-1",
          title: "Workout 1",
          completed_at: "2024-01-01T00:00:00Z",
          visibility: "public",
          owner_id: "user-1",
          owner_username: "user1",
          owner_display_name: "User One",
          created_at: "2024-01-01T00:00:00Z",
          points: 100,
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockBookmarks>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockBookmarks);
          return Promise.resolve(mockBookmarks);
        }) as never;

      const result = await feedRepository.listBookmarkedSessions("user-123");

      expect(result).toEqual(mockBookmarks);
      expect(mockQueryBuilder.join).toHaveBeenCalled();
    });
  });

  describe("listCommentsForFeedItem", () => {
    it("should list comments for feed item", async () => {
      const mockComments = [
        {
          id: "comment-1",
          feed_item_id: "feed-123",
          user_id: "user-1",
          username: "user1",
          display_name: "User One",
          body: "Great!",
          created_at: "2024-01-01T00:00:00Z",
          edited_at: null,
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockComments>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockComments);
          return Promise.resolve(mockComments);
        }) as never;

      const result = await feedRepository.listCommentsForFeedItem("feed-123");

      expect(result).toEqual(mockComments);
      expect(mockQueryBuilder.join).toHaveBeenCalled();
    });
  });

  describe("getLeaderboardRows", () => {
    it("should get global weekly leaderboard", async () => {
      const mockRows = [
        {
          user_id: "user-1",
          username: "user1",
          display_name: "User One",
          points: 1000,
          badges_count: 5,
        },
      ];

      (mockQueryBuilder as unknown as Promise<typeof mockRows>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve(mockRows);
          return Promise.resolve(mockRows);
        }) as never;

      const result = await feedRepository.getLeaderboardRows({
        period: "week",
        scope: "global",
        limit: 25,
      });

      expect(result).toEqual(mockRows);
    });

    it("should filter friends leaderboard", async () => {
      (mockQueryBuilder as unknown as Promise<[]>).then = jest
        .fn()
        .mockImplementation((resolve) => {
          resolve([]);
          return Promise.resolve([]);
        }) as never;

      await feedRepository.getLeaderboardRows({
        period: "month",
        scope: "friends",
        viewerId: "user-123",
      });

      expect(mockQueryBuilder.whereIn).toHaveBeenCalled();
    });
  });
});
