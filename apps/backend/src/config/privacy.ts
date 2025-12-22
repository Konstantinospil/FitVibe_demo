/**
 * Privacy Policy version management
 *
 * When updating the Privacy Policy document, increment this version.
 * Users with older versions will be required to re-accept the new policy on login.
 */
export const CURRENT_PRIVACY_POLICY_VERSION = "2024-06-01";

/**
 * Get the current Privacy Policy version
 */
export function getCurrentPrivacyPolicyVersion(): string {
  return CURRENT_PRIVACY_POLICY_VERSION;
}

/**
 * Check if a user's accepted privacy policy version is outdated
 */
export function isPrivacyPolicyVersionOutdated(userVersion: string | null | undefined): boolean {
  if (!userVersion) {
    return true; // No version means not accepted
  }
  return userVersion !== CURRENT_PRIVACY_POLICY_VERSION;
}
