// apps/backend/src/modules/system/system.routes.ts
/**
 * Health & system status routes
 * B-CC-6 — readiness/liveness probe
 * B-CC-9 — read-only mode kill-switch
 */
import type { Request, Response } from "express";
import { Router } from "express";
import pkg from "../../../package.json";
import { env } from "../../config/env.js";
import { requireAuth } from "../users/users.middleware.js";
import { requireRole } from "../common/rbac.middleware.js";
import { rateLimitByUser } from "../common/rateLimiter.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { insertAudit } from "../common/audit.util.js";
import { logger } from "../../config/logger.js";

const router = Router();

/**
 * Health check endpoint
 * Always accessible, even in read-only mode
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    version: pkg.version,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get system configuration for frontend feature flags + maintenance mode
 * Public endpoint (read-only)
 */
router.get(
  "/config",
  asyncHandler((_req: Request, res: Response) => {
    res.status(200).json({
      readOnlyMode: env.readOnlyMode,
      maintenanceMode: env.maintenanceMode,
      maintenanceMessage: env.maintenanceMessage ?? undefined,
      features: {
        socialFeed: false,
        coachDashboard: false,
        insights: false,
      },
      timestamp: new Date().toISOString(),
    });
    return Promise.resolve();
  }),
);

/**
 * Get read-only mode status
 * Public endpoint - anyone can check if system is in maintenance
 */
router.get(
  "/read-only/status",
  asyncHandler((_req: Request, res: Response) => {
    res.status(200).json({
      readOnlyMode: env.readOnlyMode,
      message: env.readOnlyMode ? env.maintenanceMessage : null,
      timestamp: new Date().toISOString(),
    });
    return Promise.resolve();
  }),
);

/**
 * Enable maintenance mode
 */
router.post(
  "/maintenance/enable",
  requireAuth,
  requireRole("admin"),
  rateLimitByUser("system_maintenance_toggle", 10, 60),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { message?: string };
    (env as { maintenanceMode: boolean }).maintenanceMode = true;
    if (body.message) {
      (env as { maintenanceMessage?: string }).maintenanceMessage = body.message;
    }

    logger.warn(
      { actorUserId: req.user?.sub, message: body.message },
      "[system] Maintenance mode ENABLED",
    );

    await insertAudit({
      actorUserId: req.user?.sub as string,
      entity: "system",
      action: "maintenance_enabled",
      entityId: "system",
      metadata: { message: body.message },
    });

    res.status(200).json({
      success: true,
      maintenanceMode: true,
      message: env.maintenanceMessage,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * Disable maintenance mode
 */
router.post(
  "/maintenance/disable",
  requireAuth,
  requireRole("admin"),
  rateLimitByUser("system_maintenance_toggle", 10, 60),
  asyncHandler(async (req: Request, res: Response) => {
    (env as { maintenanceMode: boolean }).maintenanceMode = false;

    logger.warn({ actorUserId: req.user?.sub }, "[system] Maintenance mode DISABLED");

    await insertAudit({
      actorUserId: req.user?.sub as string,
      entity: "system",
      action: "maintenance_disabled",
      entityId: "system",
    });

    res.status(200).json({
      success: true,
      maintenanceMode: false,
      message: env.maintenanceMessage,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * Disable ClamAV scanning
 */
router.post(
  "/clamav/disable",
  requireAuth,
  requireRole("admin"),
  rateLimitByUser("system_clamav_toggle", 10, 60),
  asyncHandler(async (req: Request, res: Response) => {
    (env as { clamav: { enabled: boolean } }).clamav.enabled = false;

    logger.warn({ actorUserId: req.user?.sub }, "[system] ClamAV disabled");

    await insertAudit({
      actorUserId: req.user?.sub as string,
      entity: "system",
      action: "clamav_disabled",
      entityId: "system",
    });

    res.status(200).json({
      success: true,
      clamavEnabled: false,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * Enable ClamAV scanning
 */
router.post(
  "/clamav/enable",
  requireAuth,
  requireRole("admin"),
  rateLimitByUser("system_clamav_toggle", 10, 60),
  asyncHandler(async (req: Request, res: Response) => {
    (env as { clamav: { enabled: boolean } }).clamav.enabled = true;

    logger.warn({ actorUserId: req.user?.sub }, "[system] ClamAV enabled");

    await insertAudit({
      actorUserId: req.user?.sub as string,
      entity: "system",
      action: "clamav_enabled",
      entityId: "system",
    });

    res.status(200).json({
      success: true,
      clamavEnabled: true,
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * Enable read-only mode
 * Admin-only endpoint for emergency maintenance
 *
 * @example
 * POST /api/v1/system/read-only/enable
 * {
 *   "reason": "Emergency database maintenance",
 *   "estimatedDuration": "30 minutes"
 * }
 */
router.post(
  "/read-only/enable",
  requireAuth,
  requireRole("admin"),
  rateLimitByUser("system_read_only_toggle", 10, 60),
  asyncHandler(async (req: Request, res: Response) => {
    const previousState = env.readOnlyMode;
    const body = req.body as { reason?: string; estimatedDuration?: string };

    // Enable read-only mode (Note: This is runtime-only, not persisted)
    // For persistent changes, update environment variable and restart
    (env as { readOnlyMode: boolean }).readOnlyMode = true;
    (env as { maintenanceMode: boolean }).maintenanceMode = true;

    logger.warn(
      {
        actorUserId: req.user?.sub,
        reason: body.reason,
        estimatedDuration: body.estimatedDuration,
        previousState,
      },
      "[system] Read-only mode ENABLED",
    );

    await insertAudit({
      actorUserId: req.user?.sub as string,
      entity: "system",
      action: "read_only_enabled",
      entityId: "system",
      metadata: {
        reason: body.reason || "Manual activation",
        estimatedDuration: body.estimatedDuration,
        previousState,
      },
    });

    res.status(200).json({
      success: true,
      readOnlyMode: true,
      message: "Read-only mode has been enabled. All mutation requests will be blocked.",
      timestamp: new Date().toISOString(),
    });
  }),
);

/**
 * Disable read-only mode
 * Admin-only endpoint to restore normal operations
 *
 * @example
 * POST /api/v1/system/read-only/disable
 * {
 *   "notes": "Maintenance completed successfully"
 * }
 */
router.post(
  "/read-only/disable",
  requireAuth,
  requireRole("admin"),
  rateLimitByUser("system_read_only_toggle", 10, 60),
  asyncHandler(async (req: Request, res: Response) => {
    const previousState = env.readOnlyMode;
    const body = req.body as { notes?: string };

    // Disable read-only mode
    (env as { readOnlyMode: boolean }).readOnlyMode = false;

    logger.info(
      {
        actorUserId: req.user?.sub,
        notes: body.notes,
        previousState,
      },
      "[system] Read-only mode DISABLED",
    );

    await insertAudit({
      actorUserId: req.user?.sub as string,
      entity: "system",
      action: "read_only_disabled",
      entityId: "system",
      metadata: {
        notes: body.notes || "Manual deactivation",
        previousState,
      },
    });

    res.status(200).json({
      success: true,
      readOnlyMode: false,
      message: "Read-only mode has been disabled. System is back to normal operation.",
      timestamp: new Date().toISOString(),
    });
  }),
);

export default router;
