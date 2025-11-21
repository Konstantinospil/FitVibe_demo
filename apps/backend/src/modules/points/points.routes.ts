import { Router } from "express";

import { requireAuth } from "../users/users.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  getPointsHistoryHandler,
  getPointsSummaryHandler,
  getBadgeCatalogHandler,
} from "./points.controller.js";
import { rateLimit } from "../common/rateLimiter.js";

export const pointsRouter = Router();

pointsRouter.get("/", requireAuth, asyncHandler(getPointsSummaryHandler));
pointsRouter.get("/history", requireAuth, asyncHandler(getPointsHistoryHandler));
pointsRouter.get(
  "/badges",
  rateLimit("badges_catalog", 60, 60),
  asyncHandler(getBadgeCatalogHandler),
);
