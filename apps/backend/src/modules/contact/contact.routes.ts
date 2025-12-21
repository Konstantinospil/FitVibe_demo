import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuth } from "../users/users.middleware.js";
import { requireRole } from "../common/rbac.middleware.js";
import { rateLimit } from "../common/rateLimiter.js";
import {
  submitContactHandler,
  listContactMessagesHandler,
  getContactMessageHandler,
} from "./contact.controller.js";

export const contactRouter = Router();

// Public endpoint - submit contact form
contactRouter.post(
  "/",
  rateLimit("contact_submit", 10, 3600), // 10 requests per hour
  asyncHandler(submitContactHandler),
);

// Admin endpoints - require authentication and admin role
contactRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  rateLimit("contact_list", 60, 60),
  asyncHandler(listContactMessagesHandler),
);

contactRouter.get(
  "/:id",
  requireAuth,
  requireRole("admin"),
  rateLimit("contact_get", 60, 60),
  asyncHandler(getContactMessageHandler),
);
