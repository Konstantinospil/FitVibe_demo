export {
  register,
  resendVerificationEmail,
  verifyEmail,
} from "./auth.registration.service.js";
export { login, verify2FALogin, refresh, logout } from "./auth.login.service.js";
export { requestPasswordReset, resetPassword } from "./auth.password.service.js";
export { listSessions, revokeSessions } from "./auth.sessions.service.js";
export {
  acceptTerms,
  revokeTerms,
  getLegalDocumentsStatus,
  type LegalDocumentStatus,
  type LegalDocumentsStatus,
} from "./auth.legal.service.js";
