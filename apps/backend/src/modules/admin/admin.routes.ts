/**
 * Admin routes - Routes for admin-only operations
 */

import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuth } from "../users/users.middleware.js";
import { requireRole } from "../common/rbac.middleware.js";
import { rateLimit } from "../common/rateLimiter.js";
import {
  listReportsHandler,
  moderateReportHandler,
  searchUsersHandler,
  userActionHandler,
} from "./admin.controller.js";

export const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(requireAuth);
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

// Specific user action endpoints for RESTful compatibility
adminRouter.post(
  "/users/:userId/suspend",
  rateLimit("admin_users_suspend", 30, 60),
  asyncHandler((req, res) => {
    req.body = { ...(req.body as object), action: "suspend" };
    return userActionHandler(req, res);
  }),
);

adminRouter.post(
  "/users/:userId/ban",
  rateLimit("admin_users_ban", 30, 60),
  asyncHandler((req, res) => {
    req.body = { ...(req.body as object), action: "ban" };
    return userActionHandler(req, res);
  }),
);

adminRouter.post(
  "/users/:userId/activate",
  rateLimit("admin_users_activate", 30, 60),
  asyncHandler((req, res) => {
    req.body = { ...(req.body as object), action: "activate" };
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
