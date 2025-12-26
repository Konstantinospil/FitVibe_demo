/**
 * Consent repository - Database operations for cookie consents
 */

import { db } from "../../db/connection.js";
import type {
  CookieConsent,
  CookieConsentRow,
  CreateCookieConsentInput,
  UpdateCookieConsentInput,
} from "./consent.types.js";

const COOKIE_CONSENTS_TABLE = "cookie_consents";

function toCookieConsent(row: CookieConsentRow): CookieConsent {
  return {
    id: row.id,
    ipAddress: row.ip_address,
    consentVersion: row.consent_version,
    essentialCookies: row.essential_cookies,
    preferencesCookies: row.preferences_cookies,
    analyticsCookies: row.analytics_cookies,
    marketingCookies: row.marketing_cookies,
    consentGivenAt: row.consent_given_at,
    lastUpdatedAt: row.last_updated_at,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get consent by IP address
 */
export async function getConsentByIp(ipAddress: string): Promise<CookieConsent | undefined> {
  const row = await db(COOKIE_CONSENTS_TABLE)
    .select<
      CookieConsentRow[]
    >(["id", "ip_address", "consent_version", "essential_cookies", "preferences_cookies", "analytics_cookies", "marketing_cookies", "consent_given_at", "last_updated_at", "user_agent", "created_at", "updated_at"])
    .where("ip_address", ipAddress)
    .first();

  return row ? toCookieConsent(row) : undefined;
}

/**
 * Upsert consent for IP address
 * Uses INSERT ... ON CONFLICT to handle both create and update
 */
export async function upsertConsent(
  ipAddress: string,
  input: CreateCookieConsentInput | UpdateCookieConsentInput,
): Promise<CookieConsent> {
  const now = new Date().toISOString();

  // Determine if this is a Create or Update input
  const isCreateInput = "consentVersion" in input && "essentialCookies" in input;

  // Prepare data for insert/update
  const insertData: Partial<CookieConsentRow> = {
    ip_address: ipAddress,
    consent_version: isCreateInput ? input.consentVersion : (input.consentVersion ?? "2024-06-01"),
    essential_cookies: isCreateInput ? input.essentialCookies : (input.essentialCookies ?? true),
    preferences_cookies: isCreateInput
      ? input.preferencesCookies
      : (input.preferencesCookies ?? false),
    analytics_cookies: isCreateInput ? input.analyticsCookies : (input.analyticsCookies ?? false),
    marketing_cookies: isCreateInput ? input.marketingCookies : (input.marketingCookies ?? false),
    user_agent: input.userAgent ?? null,
    consent_given_at: now,
    last_updated_at: now,
    created_at: now,
    updated_at: now,
  };

  // Use PostgreSQL's INSERT ... ON CONFLICT for upsert
  const [row] = await db(COOKIE_CONSENTS_TABLE)
    .insert(insertData)
    .onConflict("ip_address")
    .merge({
      consent_version: insertData.consent_version,
      essential_cookies: insertData.essential_cookies,
      preferences_cookies: insertData.preferences_cookies,
      analytics_cookies: insertData.analytics_cookies,
      marketing_cookies: insertData.marketing_cookies,
      user_agent: insertData.user_agent,
      last_updated_at: now,
      updated_at: now,
    })
    .returning<CookieConsentRow[]>([
      "id",
      "ip_address",
      "consent_version",
      "essential_cookies",
      "preferences_cookies",
      "analytics_cookies",
      "marketing_cookies",
      "consent_given_at",
      "last_updated_at",
      "user_agent",
      "created_at",
      "updated_at",
    ]);

  return toCookieConsent(row);
}
