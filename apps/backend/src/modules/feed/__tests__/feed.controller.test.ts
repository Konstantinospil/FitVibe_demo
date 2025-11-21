import type { Request, Response } from "express";
import * as feedController from "../feed.controller.js";
import * as feedService from "../feed.service.js";
import * as tokensService from "../../../services/tokens.js";

// Mock dependencies
jest.mock("../feed.service.js");
jest.mock("../../../services/tokens.js");

const mockFeedService = jest.mocked(feedService);
const mockTokensService = jest.mocked(tokensService);

describe("Feed Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: { sub: "user-123" },
      params: {},
      query: {},
      body: {},
      headers: {},
      get: jest.fn((headerName: string) => {
        return (mockRequest.headers as Record<string, string>)?.[headerName.toLowerCase()];
      }),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
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
});
