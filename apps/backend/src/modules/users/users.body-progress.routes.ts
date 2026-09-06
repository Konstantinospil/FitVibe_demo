import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/async-handler.js";
import { rateLimit } from "../common/rateLimiter.js";
import { requireAuth } from "./users.middleware.js";
import {
  addBodyWeightHandler,
  deleteBodyProgressPhotoHandler,
  getBodyProgressHandler,
  getBodyProgressPhotoHandler,
  uploadBodyProgressPhotoHandler,
} from "./users.body-progress.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const usersBodyProgressRouter = Router();

usersBodyProgressRouter.get(
  "/me/body-progress",
  rateLimit("user_body_progress_get", 60, 60),
  requireAuth,
  asyncHandler(getBodyProgressHandler),
);

usersBodyProgressRouter.post(
  "/me/body-progress/weight",
  rateLimit("user_body_progress_weight", 30, 60),
  requireAuth,
  asyncHandler(addBodyWeightHandler),
);

usersBodyProgressRouter.post(
  "/me/body-progress/photo",
  rateLimit("user_body_progress_photo_upload", 10, 60),
  requireAuth,
  upload.single("photo"),
  asyncHandler(uploadBodyProgressPhotoHandler),
);

usersBodyProgressRouter.get(
  "/me/body-progress/photo/:id",
  rateLimit("user_body_progress_photo_get", 120, 60),
  requireAuth,
  asyncHandler(getBodyProgressPhotoHandler),
);

usersBodyProgressRouter.delete(
  "/me/body-progress/photo/:id",
  rateLimit("user_body_progress_photo_delete", 30, 60),
  requireAuth,
  asyncHandler(deleteBodyProgressPhotoHandler),
);
