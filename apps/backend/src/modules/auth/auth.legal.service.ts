import { db } from "../../db/index.js";
import { getCurrentTermsVersion, isTermsVersionOutdated } from "../../config/terms.js";
import { HttpError } from "../../utils/http.js";
import { findUserById } from "./auth.repository.js";
import { recordAuthAuditEvent } from "./auth.audit.js";

export type LegalDocumentStatus = {
  accepted: boolean;
  acceptedAt: string | null;
  acceptedVersion: string | null;
  currentVersion: string;
  needsAcceptance: boolean;
};

export type LegalDocumentsStatus = {
  terms: LegalDocumentStatus;
  privacy: LegalDocumentStatus;
};

export async function acceptTerms(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const termsVersion = getCurrentTermsVersion();

  await db("users").where({ id: userId }).update({
    terms_accepted: true,
    terms_accepted_at: now,
    terms_version: termsVersion,
    updated_at: now,
  });

  await recordAuthAuditEvent(userId, "auth.terms_accepted", {
    termsVersion,
    acceptedAt: now,
  });
}

export async function revokeTerms(userId: string): Promise<void> {
  const now = new Date().toISOString();

  await db("users").where({ id: userId }).update({
    terms_accepted: false,
    terms_accepted_at: null,
    terms_version: null,
    updated_at: now,
  });

  await recordAuthAuditEvent(userId, "auth.terms_revoked", {
    revokedAt: now,
  });
}

export async function getLegalDocumentsStatus(userId: string): Promise<LegalDocumentsStatus> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "AUTH_USER_NOT_FOUND", "AUTH_USER_NOT_FOUND");
  }

  const currentTerms = getCurrentTermsVersion();
  const termsNeedsAcceptance = !user.terms_accepted || isTermsVersionOutdated(user.terms_version);

  return {
    terms: {
      accepted: Boolean(user.terms_accepted) && !termsNeedsAcceptance,
      acceptedAt: user.terms_accepted_at,
      acceptedVersion: user.terms_version,
      currentVersion: currentTerms,
      needsAcceptance: termsNeedsAcceptance,
    },
    privacy: {
      accepted: false,
      acceptedAt: null,
      acceptedVersion: null,
      currentVersion: currentTerms,
      needsAcceptance: false,
    },
  };
}
