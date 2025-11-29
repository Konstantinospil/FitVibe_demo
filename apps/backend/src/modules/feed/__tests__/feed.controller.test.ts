import type { Request, Response } from "express";
import { HttpError } from "../../../utils/http.js";
import * as feedController from "../feed.controller.js";
import * as feedService from "../feed.service.js";
import * as tokensService from "../../../services/tokens.js";

// Mock dependencies
jest.mock("../feed.service.js");
jest.mock("../../../services/tokens.js");
jest.mock("../../common/idempotency.helpers", () => ({
  getIdempotencyKey: jest.fn(),
  getRouteTemplate: jest.fn(),
}));
jest.mock("../../common/idempotency.service", () => ({
  resolveIdempotency: jest.fn(),
  persistIdempotencyResult: jest.fn(),
}));

const mockFeedService = jest.mocked(feedService);
const mockTokensService = jest.mocked(tokensService);

// Import mocked modules
import { getIdempotencyKey, getRouteTemplate } from "../../common/idempotency.helpers";
import { resolveIdempotency, persistIdempotencyResult } from "../../common/idempotency.service";

const mockGetIdempotencyKey = jest.mocked(getIdempotencyKey);
const mockGetRouteTemplate = jest.mocked(getRouteTemplate);
const mockResolveIdempotency = jest.mocked(resolveIdempotency);
const mockPersistIdempotencyResult = jest.mocked(persistIdempotencyResult);

describe("Feed Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: { sub: "user-123", role: "user", sid: "session-123" },
      params: {},
      query: {},
      body: {},
      headers: {},
      get: jest.fn((headerName: string) => {
        return (mockRequest.headers as Record<string, string>)?.[headerName.toLowerCase()];
      }) as unknown as Request["get"],
      method: "POST",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
    mockGetIdempotencyKey.mockReturnValue(null);
    mockGetRouteTemplate.mockReturnValue("/feed/items/:feedItemId/like");
    mockResolveIdempotency.mockResolvedValue({ type: "new", recordId: "rec-1" });
    mockPersistIdempotencyResult.mockResolvedValue();
  });

  describe("getFeedHandler", () => {
    it("should get public feed without authentication", async () => {
      mockRequest.headers = {};

      const mockFeedItems = [
        { id: "item-1", type: "session", visibility: "public" },
        { id: "item-2", type: "session", visibility: "public" },
      ];

      mockFeedService.getFeed.mockResolvedValue({
        items: mockFeedItems,
        hasMore: false,
      } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20,
        offset: 0,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        items: mockFeedItems,
        hasMore: false,
      });
    });

    it("should get authenticated user feed", async () => {
      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockRequest.query = { scope: "me" };

      mockTokensService.verifyAccess.mockReturnValue({ sub: "user-123" } as never);

      mockFeedService.getFeed.mockResolvedValue({
        items: [],
        hasMore: false,
      } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: "user-123",
        scope: "me",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle pagination parameters", async () => {
      mockRequest.query = { limit: "50", offset: "20" };

      mockFeedService.getFeed.mockResolvedValue({
        items: [],
        hasMore: true,
      } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 50,
        offset: 20,
      });
    });

    it("should limit maximum page size to 100", async () => {
      mockRequest.query = { limit: "200" };

      mockFeedService.getFeed.mockResolvedValue({
        items: [],
        hasMore: false,
      } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });
  });

  describe("likeFeedItemHandler", () => {
    it("should like a feed item", async () => {
      mockRequest.params = { feedItemId: "item-123" };

      mockFeedService.likeFeedItem.mockResolvedValue({ liked: true } as never);

      await feedController.likeFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.likeFeedItem).toHaveBeenCalledWith("user-123", "item-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ liked: true });
    });
  });

  describe("unlikeFeedItemHandler", () => {
    it("should unlike a feed item", async () => {
      mockRequest.params = { feedItemId: "item-123" };

      mockFeedService.unlikeFeedItem.mockResolvedValue({ unliked: true } as never);

      await feedController.unlikeFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unlikeFeedItem).toHaveBeenCalledWith("user-123", "item-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ unliked: true });
    });
  });

  describe("bookmarkSessionHandler", () => {
    it("should bookmark a session", async () => {
      mockRequest.params = { sessionId: "session-123" };

      mockFeedService.bookmarkSession.mockResolvedValue({ bookmarked: true } as never);

      await feedController.bookmarkSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.bookmarkSession).toHaveBeenCalledWith("user-123", "session-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ bookmarked: true });
    });
  });

  describe("removeBookmarkHandler", () => {
    it("should remove a bookmark", async () => {
      mockRequest.params = { sessionId: "session-123" };

      mockFeedService.removeBookmark.mockResolvedValue({ removed: true } as never);

      await feedController.removeBookmarkHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.removeBookmark).toHaveBeenCalledWith("user-123", "session-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ removed: true });
    });
  });

  describe("listBookmarksHandler", () => {
    it("should list user bookmarks", async () => {
      const mockBookmarks = [
        { id: "bookmark-1", sessionId: "session-1" },
        { id: "bookmark-2", sessionId: "session-2" },
      ];

      mockFeedService.listBookmarks.mockResolvedValue(mockBookmarks as never);

      await feedController.listBookmarksHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listBookmarks).toHaveBeenCalledWith("user-123", {
        limit: 50,
        offset: 0,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ bookmarks: mockBookmarks });
    });

    it("should handle pagination for bookmarks", async () => {
      mockRequest.query = { limit: "10", offset: "5" };

      mockFeedService.listBookmarks.mockResolvedValue([] as never);

      await feedController.listBookmarksHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listBookmarks).toHaveBeenCalledWith("user-123", {
        limit: 10,
        offset: 5,
      });
    });
  });

  describe("listCommentsHandler", () => {
    it("should list comments for feed item", async () => {
      mockRequest.params = { feedItemId: "item-123" };

      const mockComments = [
        { id: "comment-1", content: "Great workout!" },
        { id: "comment-2", content: "Impressive!" },
      ];

      mockFeedService.listComments.mockResolvedValue(mockComments as never);

      await feedController.listCommentsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listComments).toHaveBeenCalledWith("item-123", {
        limit: 50,
        offset: 0,
        viewerId: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ comments: mockComments });
    });
  });

  describe("createCommentHandler", () => {
    it("should create a comment", async () => {
      mockRequest.params = { feedItemId: "item-123" };
      mockRequest.body = { body: "Nice work!" };

      const mockComment = {
        id: "comment-new",
        body: "Nice work!",
        authorId: "user-123",
      };

      mockFeedService.createComment.mockResolvedValue(mockComment as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith(
        "user-123",
        "item-123",
        "Nice work!",
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComment);
    });

    it("should create a reply to comment", async () => {
      mockRequest.params = { feedItemId: "item-123" };
      mockRequest.body = {
        body: "Thanks!",
        parentId: "comment-parent",
      };

      mockFeedService.createComment.mockResolvedValue({} as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-123", "Thanks!");
    });
  });

  describe("deleteCommentHandler", () => {
    it("should delete a comment", async () => {
      mockRequest.params = { commentId: "comment-123" };

      mockFeedService.deleteComment.mockResolvedValue({ deleted: true } as never);

      await feedController.deleteCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.deleteComment).toHaveBeenCalledWith("user-123", "comment-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ deleted: true });
    });
  });

  describe("blockUserHandler", () => {
    it("should block a user", async () => {
      mockRequest.params = { alias: "spammer" };

      mockFeedService.blockUserByAlias.mockResolvedValue({ blocked: true } as never);

      await feedController.blockUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.blockUserByAlias).toHaveBeenCalledWith("user-123", "spammer");
      expect(mockResponse.json).toHaveBeenCalledWith({ blocked: true });
    });
  });

  describe("unblockUserHandler", () => {
    it("should unblock a user", async () => {
      mockRequest.params = { alias: "previously-blocked" };

      mockFeedService.unblockUserByAlias.mockResolvedValue({ unblocked: true } as never);

      await feedController.unblockUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unblockUserByAlias).toHaveBeenCalledWith(
        "user-123",
        "previously-blocked",
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ unblocked: true });
    });
  });

  describe("reportFeedItemHandler", () => {
    it("should report a feed item", async () => {
      mockRequest.params = { feedItemId: "item-123" };
      mockRequest.body = { reason: "spam" };

      mockFeedService.reportFeedItem.mockResolvedValue({ reported: true } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-123",
        "spam",
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ reported: true });
    });
  });

  describe("reportCommentHandler", () => {
    it("should report a comment", async () => {
      mockRequest.params = { commentId: "comment-123" };
      mockRequest.body = { reason: "harassment" };

      mockFeedService.reportComment.mockResolvedValue({ reported: true } as never);

      await feedController.reportCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportComment).toHaveBeenCalledWith(
        "user-123",
        "comment-123",
        "harassment",
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ reported: true });
    });
  });

  describe("getLeaderboardHandler", () => {
    it("should get leaderboard", async () => {
      const mockLeaderboard = [
        { rank: 1, userId: "user-1", points: 1000 },
        { rank: 2, userId: "user-2", points: 900 },
      ];

      mockFeedService.getLeaderboard.mockResolvedValue(mockLeaderboard as never);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith(null, {
        limit: 25,
        period: "week",
        scope: "global",
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        leaderboard: mockLeaderboard,
        scope: "global",
        period: "week",
      });
    });
  });

  describe("createShareLinkHandler", () => {
    it("should create share link for session", async () => {
      mockRequest.params = { sessionId: "session-123" };

      const mockShareLink = {
        id: "link-id",
        token: "abc123xyz",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        max_views: null,
        view_count: 0,
        created_at: new Date().toISOString(),
      };

      mockFeedService.createShareLink.mockResolvedValue(mockShareLink as never);

      await feedController.createShareLinkHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createShareLink).toHaveBeenCalledWith("user-123", "session-123", {
        expiresAt: null,
        maxViews: null,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: mockShareLink.id,
        token: mockShareLink.token,
        maxViews: mockShareLink.max_views,
        expiresAt: mockShareLink.expires_at,
        viewCount: mockShareLink.view_count,
        createdAt: mockShareLink.created_at,
      });
    });
  });

  describe("getSharedSessionHandler", () => {
    it("should get shared session by token", async () => {
      mockRequest.params = { token: "share-token-123" };

      const mockData = {
        link: { id: "link-id", max_views: null, view_count: 0, expires_at: null },
        session: { id: "session-123", title: "Shared Workout" },
        feedItem: { id: "feed-item-id" },
      };

      mockFeedService.getSharedSession.mockResolvedValue(mockData as never);

      await feedController.getSharedSessionHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockFeedService.getSharedSession).toHaveBeenCalledWith("share-token-123");
      expect(mockResponse.json).toHaveBeenCalledWith({
        link: {
          id: mockData.link.id,
          maxViews: mockData.link.max_views,
          viewCount: 1,
          expiresAt: mockData.link.expires_at,
        },
        feedItem: mockData.feedItem,
        session: mockData.session,
      });
    });

    it("should return 404 if share link not found", async () => {
      mockRequest.params = { token: "invalid-token" };

      mockFeedService.getSharedSession.mockRejectedValue(new Error("Not found"));

      try {
        await feedController.getSharedSessionHandler(
          mockRequest as Request,
          mockResponse as Response,
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("revokeShareLinkHandler", () => {
    it("should revoke share link", async () => {
      mockRequest.params = { sessionId: "session-123" };

      const mockResult = true;

      mockFeedService.revokeShareLink.mockResolvedValue(mockResult as never);

      await feedController.revokeShareLinkHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.revokeShareLink).toHaveBeenCalledWith("user-123", "session-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ revoked: mockResult });
    });
  });

  describe("cloneSessionFromFeedHandler", () => {
    it("should clone session from feed", async () => {
      mockRequest.params = { sessionId: "session-123" };
      const plannedAt = new Date().toISOString();
      mockRequest.body = {
        plannedAt,
      };

      const mockClonedSession = {
        id: "cloned-session-id",
        title: "Cloned Session",
      };

      mockFeedService.cloneSessionFromFeed.mockResolvedValue(mockClonedSession as never);

      await feedController.cloneSessionFromFeedHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockFeedService.cloneSessionFromFeed).toHaveBeenCalledWith("user-123", "session-123", {
        plannedAt,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockClonedSession);
    });
  });

  describe("followUserHandler", () => {
    it("should follow a user", async () => {
      mockRequest.params = { alias: "athlete123" };

      mockFeedService.followUserByAlias.mockResolvedValue({ followingId: "following-id" } as never);

      await feedController.followUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.followUserByAlias).toHaveBeenCalledWith("user-123", "athlete123");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ followingId: "following-id" });
    });
  });

  describe("unfollowUserHandler", () => {
    it("should unfollow a user", async () => {
      mockRequest.params = { alias: "athlete123" };

      mockFeedService.unfollowUserByAlias.mockResolvedValue({
        unfollowedId: "unfollowed-id",
      } as never);

      await feedController.unfollowUserHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unfollowUserByAlias).toHaveBeenCalledWith("user-123", "athlete123");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ unfollowedId: "unfollowed-id" });
    });
  });

  describe("listFollowersHandler", () => {
    it("should list user followers", async () => {
      mockRequest.params = { alias: "user-123" };

      const mockFollowers = [
        { id: "follower-1", username: "user1" },
        { id: "follower-2", username: "user2" },
      ];

      mockFeedService.listUserFollowers.mockResolvedValue(mockFollowers as never);

      await feedController.listFollowersHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listUserFollowers).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ followers: mockFollowers });
    });
  });

  describe("listFollowingHandler", () => {
    it("should list users being followed", async () => {
      mockRequest.params = { alias: "user-123" };

      const mockFollowing = [
        { id: "following-1", username: "coach1" },
        { id: "following-2", username: "athlete1" },
      ];

      mockFeedService.listUserFollowing.mockResolvedValue(mockFollowing as never);

      await feedController.listFollowingHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listUserFollowing).toHaveBeenCalledWith("user-123");
      expect(mockResponse.json).toHaveBeenCalledWith({ following: mockFollowing });
    });
  });

  describe("getFeedHandler edge cases", () => {
    it("should handle 'me' scope", async () => {
      mockRequest.query = { scope: "me" };
      mockRequest.headers = { authorization: "Bearer token" };
      mockTokensService.verifyAccess.mockReturnValue({ sub: "user-123" } as never);

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: "user-123",
        scope: "me",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle resolveViewerId with invalid token", async () => {
      mockRequest.query = { scope: "me" };
      mockRequest.headers = { authorization: "Bearer invalid-token" };
      mockTokensService.verifyAccess.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle resolveViewerId with non-Bearer authorization", async () => {
      mockRequest.query = { scope: "me" };
      mockRequest.headers = { authorization: "Basic token" };

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle resolveViewerId with missing authorization header", async () => {
      mockRequest.query = { scope: "me" };
      mockRequest.headers = {};

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle 'following' scope", async () => {
      mockRequest.query = { scope: "following" };
      mockRequest.headers = { authorization: "Bearer token" };
      mockTokensService.verifyAccess.mockReturnValue({ sub: "user-123" } as never);

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: "user-123",
        scope: "following",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle invalid scope by defaulting to public", async () => {
      mockRequest.query = { scope: "invalid" };
      mockRequest.headers = {};

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20,
        offset: 0,
      });
    });

    it("should handle array query values", async () => {
      mockRequest.query = { limit: ["50", "100"], offset: ["10"] };
      mockRequest.headers = {};

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 50,
        offset: 10,
      });
    });

    it("should handle invalid limit values", async () => {
      mockRequest.query = { limit: "invalid" };
      mockRequest.headers = {};

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20, // default
        offset: 0,
      });
    });

    it("should handle negative offset", async () => {
      mockRequest.query = { offset: "-10" };
      mockRequest.headers = {};

      mockFeedService.getFeed.mockResolvedValue({ items: [], hasMore: false } as never);

      await feedController.getFeedHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getFeed).toHaveBeenCalledWith({
        viewerId: null,
        scope: "public",
        limit: 20,
        offset: 0, // default for negative
      });
    });
  });

  describe("likeFeedItemHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId: "item-1" };

      await expect(
        feedController.likeFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.likeFeedItem).not.toHaveBeenCalled();
    });

    it("should handle service errors", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockFeedService.likeFeedItem.mockRejectedValue(new Error("Service error"));

      await expect(
        feedController.likeFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Service error");
    });
  });

  describe("unlikeFeedItemHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId: "item-1" };

      await expect(
        feedController.unlikeFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.unlikeFeedItem).not.toHaveBeenCalled();
    });
  });

  describe("bookmarkSessionHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId: "session-1" };

      await expect(
        feedController.bookmarkSessionHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.bookmarkSession).not.toHaveBeenCalled();
    });
  });

  describe("removeBookmarkHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId: "session-1" };

      await expect(
        feedController.removeBookmarkHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.removeBookmark).not.toHaveBeenCalled();
    });
  });

  describe("createCommentHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { content: "Test comment" };

      await expect(
        feedController.createCommentHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.createComment).not.toHaveBeenCalled();
    });

    it("should handle missing content in body", async () => {
      mockRequest.body = {};
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: "",
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-1", "");
    });

    it("should handle number body value", async () => {
      mockRequest.body = { body: 123 };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: "123",
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-1", "123");
    });

    it("should handle boolean body value", async () => {
      mockRequest.body = { body: true };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: "true",
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-1", "true");
    });

    it("should handle Date body value", async () => {
      const date = new Date("2025-01-20T10:00:00Z");
      mockRequest.body = { body: date };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: date.toISOString(),
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        date.toISOString(),
      );
    });

    it("should handle object body value by stringifying", async () => {
      mockRequest.body = { body: { nested: "value" } };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: '{"nested":"value"}',
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        '{"nested":"value"}',
      );
    });

    it("should handle non-record body", async () => {
      mockRequest.body = "not an object";
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: "",
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-1", "");
    });

    it("should handle null body value", async () => {
      mockRequest.body = { body: null };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: "",
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-1", "");
    });

    it("should handle undefined body value", async () => {
      mockRequest.body = { body: undefined };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: "",
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith("user-123", "item-1", "");
    });

    it("should handle array body value by stringifying", async () => {
      mockRequest.body = { body: ["item1", "item2"] };
      mockRequest.params = { feedItemId: "item-1" };

      mockFeedService.createComment.mockResolvedValue({
        id: "comment-1",
        content: '["item1","item2"]',
      } as never);

      await feedController.createCommentHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.createComment).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        '["item1","item2"]',
      );
    });
  });

  describe("deleteCommentHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { commentId: "comment-1" };

      await expect(
        feedController.deleteCommentHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.deleteComment).not.toHaveBeenCalled();
    });
  });

  describe("blockUserHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias: "user-123" };

      await expect(
        feedController.blockUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.blockUserByAlias).not.toHaveBeenCalled();
    });
  });

  describe("unblockUserHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias: "user-123" };

      await expect(
        feedController.unblockUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.unblockUserByAlias).not.toHaveBeenCalled();
    });
  });

  describe("reportFeedItemHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { reason: "spam" };

      await expect(
        feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.reportFeedItem).not.toHaveBeenCalled();
    });
  });

  describe("reportCommentHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { commentId: "comment-1" };
      mockRequest.body = { reason: "spam" };

      await expect(
        feedController.reportCommentHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.reportComment).not.toHaveBeenCalled();
    });
  });

  describe("followUserHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { alias: "user-123" };

      await expect(
        feedController.followUserHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.followUserByAlias).not.toHaveBeenCalled();
    });
  });

  describe("createShareLinkHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId: "session-1" };

      await expect(
        feedController.createShareLinkHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.createShareLink).not.toHaveBeenCalled();
    });
  });

  describe("revokeShareLinkHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId: "session-1" };

      await expect(
        feedController.revokeShareLinkHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.revokeShareLink).not.toHaveBeenCalled();
    });
  });

  describe("cloneSessionFromFeedHandler error cases", () => {
    it("should throw 401 when user is not authenticated", async () => {
      mockRequest.user = undefined;
      mockRequest.params = { sessionId: "session-1" };

      await expect(
        feedController.cloneSessionFromFeedHandler(
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow("UNAUTHENTICATED");

      expect(mockFeedService.cloneSessionFromFeed).not.toHaveBeenCalled();
    });
  });

  describe("getSharedSessionHandler error cases", () => {
    it("should handle service errors", async () => {
      mockRequest.params = { token: "invalid-token" };
      mockFeedService.getSharedSession.mockRejectedValue(
        new HttpError(404, "E.NOT_FOUND", "Share link not found"),
      );

      await expect(
        feedController.getSharedSessionHandler(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow("Share link not found");
    });
  });

  describe("idempotency scenarios", () => {
    it("should replay idempotent like request", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockGetIdempotencyKey.mockReturnValue("key-123");
      mockResolveIdempotency.mockResolvedValue({
        type: "replay",
        status: 200,
        body: { liked: true },
      });

      await feedController.likeFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotent-Replayed", "true");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ liked: true });
      expect(mockFeedService.likeFeedItem).not.toHaveBeenCalled();
    });

    it("should handle idempotent unlike request with pending resolution", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockGetIdempotencyKey.mockReturnValue("key-123");
      mockResolveIdempotency.mockResolvedValue({
        type: "pending",
        recordId: "rec-1",
      });
      mockFeedService.unlikeFeedItem.mockResolvedValue({ unliked: true } as never);

      await feedController.unlikeFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.unlikeFeedItem).toHaveBeenCalledWith("user-123", "item-1");
      expect(mockPersistIdempotencyResult).toHaveBeenCalledWith("rec-1", 200, { unliked: true });
      expect(mockResponse.set).toHaveBeenCalledWith("Idempotency-Key", "key-123");
    });

    it("should handle idempotent bookmark request", async () => {
      mockRequest.params = { sessionId: "session-1" };
      mockRequest.headers = { "idempotency-key": "key-123" };
      mockGetIdempotencyKey.mockReturnValue("key-123");
      mockResolveIdempotency.mockResolvedValue({
        type: "new",
        recordId: "rec-1",
      });
      mockFeedService.bookmarkSession.mockResolvedValue({ bookmarked: true } as never);

      await feedController.bookmarkSessionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.bookmarkSession).toHaveBeenCalledWith("user-123", "session-1");
      expect(mockPersistIdempotencyResult).toHaveBeenCalledWith("rec-1", 200, { bookmarked: true });
    });
  });

  describe("reportFeedItemHandler body parsing", () => {
    it("should handle missing reason in body", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = {};

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "",
        undefined,
      );
    });

    it("should handle details in body", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { reason: "spam", details: "This is spam content" };

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "spam",
        details: "This is spam content",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "spam",
        "This is spam content",
      );
    });

    it("should handle non-string reason", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { reason: 123 };

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "",
        undefined,
      );
    });

    it("should handle non-string details", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { reason: "spam", details: 123 };

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "spam",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "spam",
        undefined,
      );
    });

    it("should handle missing reason and details", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = {};

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "",
        undefined,
      );
    });

    it("should handle non-string reason value", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { reason: { nested: "object" } };

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "",
        undefined,
      );
    });

    it("should handle non-string details value", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.body = { reason: "spam", details: { nested: "object" } };

      mockFeedService.reportFeedItem.mockResolvedValue({
        id: "report-1",
        reason: "spam",
      } as never);

      await feedController.reportFeedItemHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.reportFeedItem).toHaveBeenCalledWith(
        "user-123",
        "item-1",
        "spam",
        undefined,
      );
    });
  });

  describe("listBookmarksHandler edge cases", () => {
    it("should handle pagination parameters", async () => {
      mockRequest.query = { limit: "75", offset: "25" };

      mockFeedService.listBookmarks.mockResolvedValue([] as never);

      await feedController.listBookmarksHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listBookmarks).toHaveBeenCalledWith("user-123", {
        limit: 75,
        offset: 25,
      });
    });

    it("should cap limit at 100", async () => {
      mockRequest.query = { limit: "200" };

      mockFeedService.listBookmarks.mockResolvedValue([] as never);

      await feedController.listBookmarksHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listBookmarks).toHaveBeenCalledWith("user-123", {
        limit: 100,
        offset: 0,
      });
    });
  });

  describe("listCommentsHandler edge cases", () => {
    it("should handle authenticated viewer", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.headers = { authorization: "Bearer token" };
      mockTokensService.verifyAccess.mockReturnValue({ sub: "viewer-123" } as never);

      mockFeedService.listComments.mockResolvedValue([] as never);

      await feedController.listCommentsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listComments).toHaveBeenCalledWith("item-1", {
        limit: 50,
        offset: 0,
        viewerId: "viewer-123",
      });
    });

    it("should cap limit at 200", async () => {
      mockRequest.params = { feedItemId: "item-1" };
      mockRequest.query = { limit: "300" };
      mockRequest.headers = {};

      mockFeedService.listComments.mockResolvedValue([] as never);

      await feedController.listCommentsHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.listComments).toHaveBeenCalledWith("item-1", {
        limit: 200,
        offset: 0,
        viewerId: undefined,
      });
    });
  });

  describe("getLeaderboardHandler edge cases", () => {
    it("should handle 'global' scope", async () => {
      mockRequest.query = { scope: "global" };
      mockRequest.headers = {};

      mockFeedService.getLeaderboard.mockResolvedValue({
        entries: [],
        period: "all-time",
      } as never);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith(null, {
        limit: 25,
        period: "week",
        scope: "global",
      });
    });

    it("should handle 'friends' scope", async () => {
      mockRequest.query = { scope: "friends" };
      mockRequest.headers = { authorization: "Bearer token" };
      mockTokensService.verifyAccess.mockReturnValue({ sub: "user-123" } as never);

      mockFeedService.getLeaderboard.mockResolvedValue({
        entries: [],
        period: "all-time",
      } as never);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith("user-123", {
        limit: 25,
        period: "week",
        scope: "friends",
      });
    });

    it("should default to 'global' scope when invalid", async () => {
      mockRequest.query = { scope: "invalid" };
      mockRequest.headers = {};

      mockFeedService.getLeaderboard.mockResolvedValue({
        entries: [],
        period: "all-time",
      } as never);

      await feedController.getLeaderboardHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFeedService.getLeaderboard).toHaveBeenCalledWith(null, {
        limit: 25,
        period: "week",
        scope: "global",
      });
    });
  });
});
