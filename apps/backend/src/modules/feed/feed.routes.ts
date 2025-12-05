import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuth } from "../users/users.middleware.js";
import { rateLimit, rateLimitByUser } from "../common/rateLimiter.js";
import {
  blockUserHandler,
  bookmarkSessionHandler,
  cloneSessionFromFeedHandler,
  createCommentHandler,
  deleteCommentHandler,
  followUserHandler,
  getFeedHandler,
  getLeaderboardHandler,
  likeFeedItemHandler,
  listBookmarksHandler,
  listCommentsHandler,
  listFollowersHandler,
  listFollowingHandler,
  removeBookmarkHandler,
  reportCommentHandler,
  reportFeedItemHandler,
  unlikeFeedItemHandler,
  unfollowUserHandler,
  unblockUserHandler,
} from "./feed.controller.js";

export const feedRouter = Router();

feedRouter.get("/", rateLimit("feed_public", 120, 60), asyncHandler(getFeedHandler));

feedRouter.get(
  "/leaderboard",
  rateLimit("feed_leaderboard", 60, 60),
  asyncHandler(getLeaderboardHandler),
);

feedRouter.post(
  "/session/:sessionId/clone",
  requireAuth,
  rateLimitByUser("feed_clone_user", 20, 60),
  rateLimit("feed_clone", 20, 60),
  asyncHandler(cloneSessionFromFeedHandler),
);

feedRouter.post(
  "/session/:sessionId/bookmark",
  requireAuth,
  rateLimitByUser("feed_bookmark_user", 100, 300),
  rateLimit("feed_bookmark", 100, 300),
  asyncHandler(bookmarkSessionHandler),
);

feedRouter.delete(
  "/session/:sessionId/bookmark",
  requireAuth,
  rateLimitByUser("feed_bookmark_user", 100, 300),
  rateLimit("feed_bookmark", 100, 300),
  asyncHandler(removeBookmarkHandler),
);

feedRouter.get(
  "/bookmarks",
  requireAuth,
  rateLimitByUser("feed_bookmark_list_user", 60, 60),
  rateLimit("feed_bookmark_list", 60, 60),
  asyncHandler(listBookmarksHandler),
);

feedRouter.post(
  "/item/:feedItemId/like",
  requireAuth,
  rateLimitByUser("feed_like_user", 100, 300),
  rateLimit("feed_like", 100, 300),
  asyncHandler(likeFeedItemHandler),
);

feedRouter.delete(
  "/item/:feedItemId/like",
  requireAuth,
  rateLimitByUser("feed_like_user", 100, 300),
  rateLimit("feed_like", 100, 300),
  asyncHandler(unlikeFeedItemHandler),
);

feedRouter.get(
  "/item/:feedItemId/comments",
  rateLimit("feed_comments_list", 120, 60),
  asyncHandler(listCommentsHandler),
);

feedRouter.post(
  "/item/:feedItemId/comments",
  requireAuth,
  rateLimitByUser("feed_comments_create_user", 20, 3600),
  rateLimit("feed_comments_create", 20, 3600),
  asyncHandler(createCommentHandler),
);

feedRouter.delete(
  "/comments/:commentId",
  requireAuth,
  rateLimitByUser("feed_comments_delete_user", 60, 3600),
  rateLimit("feed_comments_delete", 60, 3600),
  asyncHandler(deleteCommentHandler),
);

feedRouter.post(
  "/item/:feedItemId/report",
  requireAuth,
  rateLimitByUser("feed_report_item_user", 20, 3600),
  rateLimit("feed_report_item", 20, 3600),
  asyncHandler(reportFeedItemHandler),
);

feedRouter.post(
  "/comments/:commentId/report",
  requireAuth,
  rateLimitByUser("feed_report_comment_user", 20, 3600),
  rateLimit("feed_report_comment", 20, 3600),
  asyncHandler(reportCommentHandler),
);

feedRouter.post(
  "/users/:alias/block",
  requireAuth,
  rateLimitByUser("feed_block_user", 50, 86400),
  rateLimit("feed_block_user", 50, 86400),
  asyncHandler(blockUserHandler),
);

feedRouter.delete(
  "/users/:alias/block",
  requireAuth,
  rateLimitByUser("feed_block_user", 50, 86400),
  rateLimit("feed_block_user", 50, 86400),
  asyncHandler(unblockUserHandler),
);

feedRouter.post(
  "/users/:alias/follow",
  requireAuth,
  rateLimitByUser("feed_follow_user", 50, 86400),
  rateLimit("feed_follow_user", 50, 86400),
  asyncHandler(followUserHandler),
);

feedRouter.delete(
  "/users/:alias/follow",
  requireAuth,
  rateLimitByUser("feed_follow_user", 50, 86400),
  rateLimit("feed_follow_user", 50, 86400),
  asyncHandler(unfollowUserHandler),
);

feedRouter.get(
  "/users/:alias/followers",
  rateLimit("feed_followers_list", 120, 60),
  asyncHandler(listFollowersHandler),
);

feedRouter.get(
  "/users/:alias/following",
  rateLimit("feed_following_list", 120, 60),
  asyncHandler(listFollowingHandler),
);
