/**
 * Consent module types
 */

export interface CookieConsent {
  id: string;
  ipAddress: string;
  consentVersion: string;
  essentialCookies: boolean;
  preferencesCookies: boolean;
  analyticsCookies: boolean;
  marketingCookies: boolean;
  consentGivenAt: string;
  lastUpdatedAt: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CookieConsentRow {
  id: string;
  ip_address: string;
  consent_version: string;
  essential_cookies: boolean;
  preferences_cookies: boolean;
  analytics_cookies: boolean;
  marketing_cookies: boolean;
  consent_given_at: string;
  last_updated_at: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCookieConsentInput {
  ipAddress: string;
  consentVersion: string;
  essentialCookies: boolean;
  preferencesCookies: boolean;
  analyticsCookies: boolean;
  marketingCookies: boolean;
  userAgent?: string | null;
}

export interface UpdateCookieConsentInput {
  consentVersion?: string;
  essentialCookies?: boolean;
  preferencesCookies?: boolean;
  analyticsCookies?: boolean;
  marketingCookies?: boolean;
  userAgent?: string | null;
}

export interface CookieConsentResponse {
  hasConsent: boolean;
  consent?: {
    essential: boolean;
    preferences: boolean;
    analytics: boolean;
    marketing: boolean;
    version: string;
    updatedAt: string;
  };
}
