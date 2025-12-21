/**
 * Consent controller - Request/response handling
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { getConsentStatus, saveCookiePreferences } from "./consent.service.js";
import { SaveCookiePreferencesSchema } from "./consent.schemas.js";
import { extractClientIp } from "../../utils/ip-extractor.js";

/**
 * Get cookie consent status for the current IP address
 * Public endpoint - no authentication required
 */
export const getCookieStatusHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ipAddress = extractClientIp(req);

    if (ipAddress === "unknown") {
      // If IP cannot be determined, return no consent (show banner)
      res.json({
        success: true,
        data: {
          hasConsent: false,
        },
      });
      return;
    }

    const status = await getConsentStatus(ipAddress);

    res.json({
      success: true,
      data: status,
    });
  },
);

/**
 * Save cookie preferences for the current IP address
 * Public endpoint - no authentication required
 */
export const saveCookiePreferencesHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ipAddress = extractClientIp(req);
    const userAgent = req.headers["user-agent"] || null;

    if (ipAddress === "unknown") {
      // If IP cannot be determined, return error
      res.status(400).json({
        success: false,
        error: {
          code: "CONSENT_IP_UNKNOWN",
          message: "Unable to determine IP address",
        },
      });
      return;
    }

    // Validate request body
    const body = SaveCookiePreferencesSchema.parse(req.body);

    const consent = await saveCookiePreferences(ipAddress, body, userAgent);

    res.json({
      success: true,
      data: {
        essential: consent.essentialCookies,
        preferences: consent.preferencesCookies,
        analytics: consent.analyticsCookies,
        marketing: consent.marketingCookies,
        version: consent.consentVersion,
        updatedAt: consent.lastUpdatedAt,
      },
    });
  },
);
