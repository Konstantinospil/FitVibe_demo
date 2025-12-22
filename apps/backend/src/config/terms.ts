/**
 * Terms and Conditions version management
 *
 * Version is automatically calculated from the latest effectiveDateValue
 * across all language translations. When ANY language version is updated,
 * ALL languages are considered changed, ensuring users don't need to
 * re-accept based on which language they originally accepted in.
 *
 * @see apps/backend/src/config/legal-version.ts for implementation
 */

export { getCurrentTermsVersion, isTermsVersionOutdated } from "./legal-version.js";
