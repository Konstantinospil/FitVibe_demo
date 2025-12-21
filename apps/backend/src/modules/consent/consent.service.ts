/**
 * Consent service - Business logic for cookie consent management
 */

import { HttpError } from "../../utils/http.js";
import type {
  CookieConsent,
  CookieConsentResponse,
  CreateCookieConsentInput,
} from "./consent.types.js";
import { getConsentByIp, upsertConsent } from "./consent.repository.js";
import { insertAudit } from "../common/audit.util.js";

/**
 * Current cookie policy version
 * Must match the effective date in docs/5.Policies/Cookie-policy.md
 */
const CURRENT_CONSENT_VERSION = "2024-06-01";

/**
 * Get consent status for an IP address
 */
export async function getConsentStatus(ipAddress: string): Promise<CookieConsentResponse> {
  const consent = await getConsentByIp(ipAddress);

  if (!consent) {
    return {
      hasConsent: false,
    };
  }

  return {
    hasConsent: true,
    consent: {
      essential: consent.essentialCookies,
      preferences: consent.preferencesCookies,
      analytics: consent.analyticsCookies,
      marketing: consent.marketingCookies,
      version: consent.consentVersion,
      updatedAt: consent.lastUpdatedAt,
    },
  };
}

/**
 * Save cookie preferences for an IP address
 * Validates that essential cookies are always true
 */
export async function saveCookiePreferences(
  ipAddress: string,
  preferences: {
    essential: boolean;
    preferences: boolean;
    analytics: boolean;
    marketing: boolean;
  },
  userAgent?: string | null,
): Promise<CookieConsent> {
  // Validate that essential cookies are always true
  if (!preferences.essential) {
    throw new HttpError(400, "Essential cookies must be enabled", "CONSENT_ESSENTIAL_REQUIRED");
  }

  const input: CreateCookieConsentInput = {
    ipAddress,
    consentVersion: CURRENT_CONSENT_VERSION,
    essentialCookies: preferences.essential,
    preferencesCookies: preferences.preferences,
    analyticsCookies: preferences.analytics,
    marketingCookies: preferences.marketing,
    userAgent: userAgent ?? null,
  };

  const consent = await upsertConsent(ipAddress, input);

  // Audit log consent change
  await insertAudit({
    entityType: "cookie_consent",
    action: "consent_updated",
    entityId: consent.id,
    outcome: "success",
    metadata: {
      ipAddress,
      preferences: {
        essential: consent.essentialCookies,
        preferences: consent.preferencesCookies,
        analytics: consent.analyticsCookies,
        marketing: consent.marketingCookies,
      },
      version: consent.consentVersion,
    },
  });

  return consent;
}
