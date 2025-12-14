import type { Request, Response } from "express";
import * as feedController from "../../../../apps/backend/src/modules/feed/feed.controller.js";
import * as feedService from "../../../../apps/backend/src/modules/feed/feed.service.js";
import * as idempotencyService from "../../../../apps/backend/src/modules/common/idempotency.service.js";
import * as idempotencyHelpers from "../../../../apps/backend/src/modules/common/idempotency.helpers.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";

// Mock dependencies
jest.mock("../../../../apps/backend/src/modules/feed/feed.service.js");
jest.mock("../../../../apps/backend/src/modules/common/idempotency.service.js");
jest.mock("../../../../apps/backend/src/modules/common/idempotency.helpers.js");

const mockFeedService = jest.mocked(feedService);
const mockIdempotencyService = jest.mocked(idempotencyService);
const mockIdempotencyHelpers = jest.mocked(idempotencyHelpers);

describe("Feed Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const userId = "user-123";
  const feedItemId = "feed-item-123";

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: { sub: userId, role: "athlete" },
      body: {},
      query: {},
      params: {},
      headers: {},
      get: jest.fn().mockReturnValue(null),
      method: "GET",
      baseUrl: "/api/v1",
      route: { path: "/feed" },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
  });

  describe("getFeedHandler", () => {
    it("should get feed successfully with default scope", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "public",
        limit: 20,
        offset: 0,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockFeed);
    });

    it("should get feed with 'me' scope", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = { scope: "me" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "me",
        limit: 20,
        offset: 0,
      });
    });

    it("should get feed with 'following' scope", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = { scope: "following" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "following",
        limit: 20,
        offset: 0,
      });
    });

    it("should parse limit and offset from query", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 50,
        offset: 10,
      };

      mockRequest.query = { limit: "50", offset: "10" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "public",
        limit: 50,
        offset: 10,
      });
    });

    it("should enforce max limit of 100", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 100,
        offset: 0,
      };

      mockRequest.query = { limit: "200" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "public",
        limit: 100,
        offset: 0,
      });
    });

    it("should parse search query from query parameter", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = { q: "test query" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "public",
        limit: 20,
        offset: 0,
        searchQuery: "test query",
        sort: "date",
      });
    });

    it("should parse sort parameter from query", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = { sort: "popularity" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "public",
        limit: 20,
        offset: 0,
        searchQuery: null,
        sort: "popularity",
      });
    });

    it("should parse both search and sort parameters", async () => {
      const mockFeed = {
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.query = { q: "workout", sort: "relevance" };
      mockFeedService.getFeed.mockResolvedValue(mockFeed);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: userId,
        scope: "public",
        limit: 20,
        offset: 0,
        searchQuery: "workout",
        sort: "relevance",
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await expect(
        feedController.getFeedHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("likeFeedItemHandler", () => {
    it("should like feed item successfully", async () => {
      mockRequest.params = { feedItemId };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.handleIdempotentRequest.mockResolvedValue(false);
      const mockResult = { liked: true };
      mockFeedService.likeFeedItem.mockResolvedValue(mockResult);

      await feedController.likeFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.likeFeedItem).toHaveBeenCalledWith(userId, feedItemId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId };

      await expect(
        feedController.likeFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("unlikeFeedItemHandler", () => {
    it("should unlike feed item successfully", async () => {
      mockRequest.params = { feedItemId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.handleIdempotentRequest.mockResolvedValue(false);
      const mockResult = { liked: false };
      mockFeedService.unlikeFeedItem.mockResolvedValue(mockResult);

      await feedController.unlikeFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unlikeFeedItem).toHaveBeenCalledWith(userId, feedItemId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId };

      await expect(
        feedController.unlikeFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("bookmarkSessionHandler", () => {
    const sessionId = "session-123";

    it("should bookmark session successfully without idempotency", async () => {
      mockRequest.params = { sessionId };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { bookmarked: true };
      mockFeedService.bookmarkSession.mockResolvedValue(mockResult);

      await feedController.bookmarkSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.bookmarkSession).toHaveBeenCalledWith(userId, sessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should handle idempotency replay", async () => {
      mockRequest.params = { sessionId };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue("idempotency-key");
      mockIdempotencyHelpers.getRouteTemplate.mockReturnValue("/feed/bookmarks");
      mockIdempotencyService.resolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 200,
        body: { bookmarked: true },
      });

      await feedController.bookmarkSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(mockFeedService.bookmarkSession).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId };

      await expect(
        feedController.bookmarkSessionHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("removeBookmarkHandler", () => {
    const sessionId = "session-123";

    it("should remove bookmark successfully", async () => {
      mockRequest.params = { sessionId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { bookmarked: false };
      mockFeedService.removeBookmark.mockResolvedValue(mockResult);

      await feedController.removeBookmarkHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.removeBookmark).toHaveBeenCalledWith(userId, sessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId };

      await expect(
        feedController.removeBookmarkHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("listBookmarksHandler", () => {
    it("should list bookmarks successfully", async () => {
      const mockBookmarks = [{ id: "bookmark-1" }, { id: "bookmark-2" }];
      mockRequest.query = { limit: "50", offset: "0" };
      mockFeedService.listBookmarks.mockResolvedValue(mockBookmarks);

      await feedController.listBookmarksHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listBookmarks).toHaveBeenCalledWith(userId, {
        limit: 50,
        offset: 0,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ bookmarks: mockBookmarks });
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await expect(
        feedController.listBookmarksHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("listCommentsHandler", () => {
    it("should list comments successfully", async () => {
      const mockComments = [{ id: "comment-1" }, { id: "comment-2" }];
      mockRequest.params = { feedItemId };
      mockRequest.query = { limit: "50", offset: "0" };
      mockFeedService.listComments.mockResolvedValue(mockComments);

      await feedController.listCommentsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listComments).toHaveBeenCalledWith(feedItemId, {
        limit: 50,
        offset: 0,
        viewerId: userId,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ comments: mockComments });
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId };

      await expect(
        feedController.listCommentsHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("createCommentHandler", () => {
    it("should create comment successfully", async () => {
      const commentBody = "This is a comment";
      mockRequest.params = { feedItemId };
      mockRequest.body = { body: commentBody };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.handleIdempotentRequest.mockResolvedValue(false);
      const mockComment = { id: "comment-1", body: commentBody };
      mockFeedService.createComment.mockResolvedValue(mockComment);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith(userId, feedItemId, commentBody);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComment);
    });

    it("should handle comment body as number", async () => {
      mockRequest.params = { feedItemId };
      mockRequest.body = { body: 123 };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.handleIdempotentRequest.mockResolvedValue(false);
      const mockComment = { id: "comment-1", body: "123" };
      mockFeedService.createComment.mockResolvedValue(mockComment);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith(userId, feedItemId, "123");
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId };

      await expect(
        feedController.createCommentHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("deleteCommentHandler", () => {
    const commentId = "comment-123";

    it("should delete comment successfully", async () => {
      mockRequest.params = { commentId };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { deleted: true };
      mockFeedService.deleteComment.mockResolvedValue(mockResult);

      await feedController.deleteCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.deleteComment).toHaveBeenCalledWith(userId, commentId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { commentId };

      await expect(
        feedController.deleteCommentHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("blockUserHandler", () => {
    const alias = "testuser";

    it("should block user successfully", async () => {
      mockRequest.params = { alias };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { blocked: true };
      mockFeedService.blockUserByAlias.mockResolvedValue(mockResult);

      await feedController.blockUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.blockUserByAlias).toHaveBeenCalledWith(userId, alias);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias };

      await expect(
        feedController.blockUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("unblockUserHandler", () => {
    const alias = "testuser";

    it("should unblock user successfully", async () => {
      mockRequest.params = { alias };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { unblocked: true };
      mockFeedService.unblockUserByAlias.mockResolvedValue(mockResult);

      await feedController.unblockUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unblockUserByAlias).toHaveBeenCalledWith(userId, alias);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias };

      await expect(
        feedController.unblockUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("reportFeedItemHandler", () => {
    it("should report feed item successfully", async () => {
      mockRequest.params = { feedItemId };
      mockRequest.body = { reason: "spam", details: "This is spam" };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { reported: true };
      mockFeedService.reportFeedItem.mockResolvedValue(mockResult);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        userId,
        feedItemId,
        "spam",
        "This is spam",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId };

      await expect(
        feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("reportCommentHandler", () => {
    const commentId = "comment-123";

    it("should report comment successfully", async () => {
      mockRequest.params = { commentId };
      mockRequest.body = { reason: "harassment" };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { reported: true };
      mockFeedService.reportComment.mockResolvedValue(mockResult);

      await feedController.reportCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportComment).toHaveBeenCalledWith(
        userId,
        commentId,
        "harassment",
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { commentId };

      await expect(
        feedController.reportCommentHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("getLeaderboardHandler", () => {
    it("should get leaderboard successfully with default scope and period", async () => {
      const mockLeaderboard = [
        {
          rank: 1,
          user: { id: userId, username: "testuser", displayName: "Test User" },
          points: 1000,
          badges: 5,
        },
      ];

      mockFeedService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith(userId, {
        scope: "global",
        period: "week",
        limit: 25,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        leaderboard: mockLeaderboard,
        scope: "global",
        period: "week",
      });
    });

    it("should get leaderboard with friends scope", async () => {
      const mockLeaderboard = [];
      mockRequest.query = { scope: "friends" };
      mockFeedService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith(userId, {
        scope: "friends",
        period: "week",
        limit: 25,
      });
    });

    it("should get leaderboard with month period", async () => {
      const mockLeaderboard = [];
      mockRequest.query = { period: "month" };
      mockFeedService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith(userId, {
        scope: "global",
        period: "month",
        limit: 25,
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;

      await expect(
        feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("cloneSessionFromFeedHandler", () => {
    const sessionId = "session-123";

    it("should clone session successfully", async () => {
      mockRequest.params = { sessionId };
      mockRequest.body = { title: "Cloned Session" };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockCloned = { id: "cloned-123", title: "Cloned Session" };
      mockFeedService.cloneSessionFromFeed.mockResolvedValue(mockCloned);

      await feedController.cloneSessionFromFeedHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockFeedService.cloneSessionFromFeed).toHaveBeenCalledWith(userId, sessionId, {
        title: "Cloned Session",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockCloned);
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId };

      await expect(
        feedController.cloneSessionFromFeedHandler(
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("followUserHandler", () => {
    const alias = "testuser";

    it("should follow user successfully", async () => {
      mockRequest.params = { alias };
      mockRequest.method = "POST";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { followingId: "following-123" };
      mockFeedService.followUserByAlias.mockResolvedValue(mockResult);

      await feedController.followUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.followUserByAlias).toHaveBeenCalledWith(userId, alias);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ followingId: mockResult.followingId });
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias };

      await expect(
        feedController.followUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("unfollowUserHandler", () => {
    const alias = "testuser";

    it("should unfollow user successfully", async () => {
      mockRequest.params = { alias };
      mockRequest.method = "DELETE";
      mockIdempotencyHelpers.getIdempotencyKey.mockReturnValue(null);
      const mockResult = { unfollowedId: "following-123" };
      mockFeedService.unfollowUserByAlias.mockResolvedValue(mockResult);

      await feedController.unfollowUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unfollowUserByAlias).toHaveBeenCalledWith(userId, alias);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ unfollowedId: mockResult.unfollowedId });
    });

    it("should return 401 when not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias };

      await expect(
        feedController.unfollowUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(HttpError);
    });
  });

  describe("listFollowersHandler", () => {
    const alias = "testuser";

    it("should list followers successfully", async () => {
      const mockFollowers = [{ id: "follower-1" }, { id: "follower-2" }];
      mockRequest.params = { alias };
      mockFeedService.listUserFollowers.mockResolvedValue(mockFollowers);

      await feedController.listFollowersHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listUserFollowers).toHaveBeenCalledWith(alias);
      expect(mockResponse.json).toHaveBeenCalledWith({ followers: mockFollowers });
    });
  });

  describe("listFollowingHandler", () => {
    const alias = "testuser";

    it("should list following successfully", async () => {
      const mockFollowing = [{ id: "following-1" }, { id: "following-2" }];
      mockRequest.params = { alias };
      mockFeedService.listUserFollowing.mockResolvedValue(mockFollowing);

      await feedController.listFollowingHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listUserFollowing).toHaveBeenCalledWith(alias);
      expect(mockResponse.json).toHaveBeenCalledWith({ following: mockFollowing });
    });
  });
});
