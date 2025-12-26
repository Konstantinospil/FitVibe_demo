/**
 * Admin routes - Routes for admin-only operations
 */

import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAccessToken } from "../auth/auth.middleware.js";
import { requireRole } from "../common/rbac.middleware.js";
import { rateLimit } from "../common/rateLimiter.js";
import {
  listReportsHandler,
  moderateReportHandler,
  searchUsersHandler,
  userActionHandler,
  changeUserRoleHandler,
  sendVerificationEmailHandler,
  sendPasswordResetHandler,
  deleteUserAvatarHandler,
} from "./admin.controller.js";

export const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(requireAccessToken);
adminRouter.use(requireRole("admin"));

// Content Reports Management
adminRouter.get(
  "/reports",
  rateLimit("admin_reports_list", 60, 60),
  asyncHandler(listReportsHandler),
);

adminRouter.post(
  "/reports/:reportId/moderate",
  rateLimit("admin_reports_moderate", 30, 60),
  asyncHandler(moderateReportHandler),
);

// User Management
adminRouter.get(
  "/users/search",
  rateLimit("admin_users_search", 60, 60),
  asyncHandler(searchUsersHandler),
);

// Generic user action endpoint
adminRouter.post(
  "/users/:userId/action",
  rateLimit("admin_users_action", 30, 60),
  asyncHandler(userActionHandler),
);

// Change user role
adminRouter.post(
  "/users/:userId/role",
  rateLimit("admin_users_role", 30, 60),
  asyncHandler(changeUserRoleHandler),
);

// Send verification email
adminRouter.post(
  "/users/:userId/send-verification-email",
  rateLimit("admin_users_email", 30, 60),
  asyncHandler(sendVerificationEmailHandler),
);

// Send password reset email
adminRouter.post(
  "/users/:userId/send-password-reset",
  rateLimit("admin_users_email", 30, 60),
  asyncHandler(sendPasswordResetHandler),
);

// Delete user avatar
adminRouter.delete(
  "/users/:userId/avatar",
  rateLimit("admin_users_avatar", 30, 60),
  asyncHandler(deleteUserAvatarHandler),
);

// Specific user action endpoints for RESTful compatibility
adminRouter.post(
  "/users/:userId/blacklist",
  rateLimit("admin_users_blacklist", 30, 60),
  asyncHandler((req, res) => {
    req.body = { ...(req.body as object), action: "blacklist" };
    return userActionHandler(req, res);
  }),
);

adminRouter.post(
  "/users/:userId/unblacklist",
  rateLimit("admin_users_unblacklist", 30, 60),
  asyncHandler((req, res) => {
    req.body = { ...(req.body as object), action: "unblacklist" };
    return userActionHandler(req, res);
  }),
);

adminRouter.delete(
  "/users/:userId",
  rateLimit("admin_users_delete", 30, 60),
  asyncHandler((req, res) => {
    req.body = { ...(req.body as object), action: "delete" };
    return userActionHandler(req, res);
  }),
);
