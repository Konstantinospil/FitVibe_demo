/**
 * Terms and Conditions version management
 *
 * When updating the Terms and Conditions document, increment this version.
 * Users with older versions will be required to re-accept the new terms on login.
 */
export const CURRENT_TERMS_VERSION = "2024-06-01";

/**
 * Get the current Terms and Conditions version
 */
export function getCurrentTermsVersion(): string {
  return CURRENT_TERMS_VERSION;
}

/**
 * Check if a user's accepted terms version is outdated
 */
export function isTermsVersionOutdated(userVersion: string | null | undefined): boolean {
  if (!userVersion) {
    return true; // No version means not accepted
  }
  return userVersion !== CURRENT_TERMS_VERSION;
}
