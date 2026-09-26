import { Router } from "express";

import { requireAccessToken } from "../auth/auth.middleware.js";
import { rateLimit } from "../common/rateLimiter.js";
import {
  exercisesHandler,
  exportHandler,
  plansHandler,
  summaryHandler,
  trendsHandler,
  vibePointsHandler,
} from "./progress.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const progressRouter = Router();

progressRouter.get(
  "/summary",
  rateLimit("progress_summary", 60, 60),
  requireAccessToken,
  asyncHandler(summaryHandler),
);
progressRouter.get(
  "/trends",
  rateLimit("progress_trends", 60, 60),
  requireAccessToken,
  asyncHandler(trendsHandler),
);
progressRouter.get(
  "/exercises",
  rateLimit("progress_exercises", 60, 60),
  requireAccessToken,
  asyncHandler(exercisesHandler),
);
progressRouter.get(
  "/plans",
  rateLimit("progress_plans", 60, 60),
  requireAccessToken,
  asyncHandler(plansHandler),
);
progressRouter.get(
  "/vibes",
  rateLimit("progress_vibes", 60, 60),
  requireAccessToken,
  asyncHandler(vibePointsHandler),
);
progressRouter.get(
  "/export",
  rateLimit("progress_export", 15, 60),
  requireAccessToken,
  asyncHandler(exportHandler),
);
