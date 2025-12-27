import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import { useAuthStore } from "../store/auth.store";

// Use relative URLs in development (Vite proxy handles /api -> localhost:4000)
// Use full URL in production or when VITE_API_URL is explicitly set
const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "http://localhost:4000");

/**
 * SECURITY FIX (CWE-922): Cookie-based authentication
 *
 * BEFORE: Tokens in localStorage + manual Authorization header injection
 * AFTER: HttpOnly cookies sent automatically by browser
 *
 * The backend sets HttpOnly cookies (accessToken, refreshToken) on:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/refresh
 *
 * Axios sends cookies automatically with withCredentials: true.
 * No Authorization header needed - cookies are immune to XSS attacks.
 */

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _csrfRetry?: boolean;
};

export type HealthStatusResponse = {
  status: string;
  uptime?: number;
  version?: string;
  timestamp?: string;
};

const baseConfig = {
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true, // ✅ Send HttpOnly cookies automatically
};

export const apiClient = axios.create(baseConfig);

// Separate client without interceptors to avoid circular refresh attempts.
export const rawHttpClient = axios.create(baseConfig);

let isRefreshing = false;

// CSRF token management
let csrfTokenPromise: Promise<string> | null = null;
let cachedCsrfToken: string | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function fetchCsrfToken(): Promise<string> {
  // If we already have a token fetch in progress, reuse that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Create new token fetch promise
  csrfTokenPromise = (async () => {
    try {
      const response = await rawHttpClient.get<{ csrfToken: string }>("/api/v1/csrf-token");
      const token = response.data.csrfToken;
      cachedCsrfToken = token;
      return token;
    } catch (error) {
      // Clear the promise on error so we can retry
      csrfTokenPromise = null;
      throw error;
    } finally {
      // Clear the promise after completion so we can fetch a new one if needed
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

function requiresCsrfToken(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

// Request interceptor to add CSRF tokens to state-changing requests
const csrfRequestInterceptor = async (config: InternalAxiosRequestConfig) => {
  if (requiresCsrfToken(config.method || "GET")) {
    // Fetch CSRF token if we don't have one cached
    if (!cachedCsrfToken) {
      try {
        await fetchCsrfToken();
      } catch (error) {
        // If CSRF token fetch fails, still proceed - the backend will return 403
        // which we can handle in the response interceptor
        console.warn("Failed to fetch CSRF token:", error);
      }
    }

    // Add CSRF token to request header if we have one
    // Backend accepts: x-csrf-token, csrf-token, or x-xsrf-token
    if (cachedCsrfToken) {
      config.headers["x-csrf-token"] = cachedCsrfToken;
    }
  }

  return config;
};

// Add CSRF interceptor to both clients
apiClient.interceptors.request.use(csrfRequestInterceptor);
rawHttpClient.interceptors.request.use(csrfRequestInterceptor);

type QueueEntry = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: RetryableRequestConfig;
};

const refreshQueue: QueueEntry[] = [];

const enqueueRequest = (config: RetryableRequestConfig) =>
  new Promise((resolve, reject) => {
    refreshQueue.push({ resolve, reject, config });
  });

const processQueue = (error: unknown) => {
  while (refreshQueue.length > 0) {
    const { resolve, reject, config } = refreshQueue.shift() as QueueEntry;
    if (error) {
      // SECURITY FIX: Removed useless conditional - if error is truthy, use it directly
      reject(error);
      continue;
    }

    // Retry with refreshed cookies
    apiClient(config).then(resolve).catch(reject);
  }
};

const requestTokenRefresh = async (): Promise<void> => {
  // Backend reads refresh token from HttpOnly cookie
  // No need to send anything in the body
  await rawHttpClient.post("/api/v1/auth/refresh");
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    const originalRequest = config as RetryableRequestConfig | undefined;

    if (!originalRequest || !response) {
      return Promise.reject(error);
    }

    // Handle CSRF token errors (403)
    if (response.status === 403) {
      const errorCode = (response.data as { error?: { code?: string } })?.error?.code;
      if (
        errorCode === "CSRF_TOKEN_INVALID" &&
        !originalRequest._csrfRetry &&
        requiresCsrfToken(originalRequest.method || "GET")
      ) {
        originalRequest._csrfRetry = true;
        // Clear cached token and fetch a new one
        cachedCsrfToken = null;
        try {
          await fetchCsrfToken();
          // Clear the old token from headers so the interceptor adds the new one
          delete originalRequest.headers["x-csrf-token"];
          // Retry the request with the new CSRF token (interceptor will add it)
          return apiClient(originalRequest);
        } catch {
          // If fetching CSRF token fails, reject with original error
          return Promise.reject(error);
        }
      }
    }

    // Only attempt refresh on 401, and only once per request
    if (response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Queue concurrent requests during refresh
    if (isRefreshing) {
      return enqueueRequest(originalRequest);
    }

    isRefreshing = true;

    try {
      // Refresh the HttpOnly cookies
      await requestTokenRefresh();

      // Process queued requests (cookies are now fresh)
      processQueue(null);

      // Retry the original request with fresh cookies
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Check if error is due to outdated terms
      if (refreshError && typeof refreshError === "object" && "response" in refreshError) {
        const axiosError = refreshError as {
          response?: { data?: { error?: { code?: string } } };
        };
        const errorCode = axiosError.response?.data?.error?.code;

        if (
          errorCode === "TERMS_VERSION_OUTDATED" ||
          errorCode === "PRIVACY_POLICY_VERSION_OUTDATED" ||
          errorCode === "LEGAL_DOCUMENTS_VERSION_OUTDATED"
        ) {
          // Redirect to terms re-acceptance page (will handle both documents)
          processQueue(refreshError);
          // Try to get document status from error response
          const termsOutdated =
            (refreshError as { response?: { data?: { termsOutdated?: boolean } } })?.response?.data
              ?.termsOutdated ?? true;
          const privacyOutdated =
            (refreshError as { response?: { data?: { privacyPolicyOutdated?: boolean } } })
              ?.response?.data?.privacyPolicyOutdated ?? false;
          // Redirect to the appropriate page - Terms takes priority if both need acceptance
          if (termsOutdated) {
            window.location.href = `/terms`;
          } else if (privacyOutdated) {
            window.location.href = `/privacy`;
          }
          const error =
            refreshError instanceof Error
              ? refreshError
              : new Error(refreshError ? JSON.stringify(refreshError) : "Unknown error");
          return Promise.reject(error);
        }
      }

      // Refresh failed - sign out and clear cookies
      processQueue(refreshError);
      useAuthStore
        .getState()
        .signOut()
        .catch(() => {
          // Ignore sign out errors during token refresh failure
        });

      // Optionally call logout endpoint to clear server-side session
      try {
        await rawHttpClient.post("/api/v1/auth/logout");
      } catch {
        // Ignore logout errors during error handling
      }

      const error = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

// Add CSRF error handling to rawHttpClient as well (for registration, login, etc.)
rawHttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    const originalRequest = config as RetryableRequestConfig | undefined;

    if (!originalRequest || !response) {
      return Promise.reject(error);
    }

    // Handle CSRF token errors (403)
    if (response.status === 403) {
      const errorCode = (response.data as { error?: { code?: string } })?.error?.code;
      if (
        errorCode === "CSRF_TOKEN_INVALID" &&
        !originalRequest._csrfRetry &&
        requiresCsrfToken(originalRequest.method || "GET")
      ) {
        originalRequest._csrfRetry = true;
        // Clear cached token and fetch a new one
        cachedCsrfToken = null;
        try {
          await fetchCsrfToken();
          // Clear the old token from headers so the interceptor adds the new one
          delete originalRequest.headers["x-csrf-token"];
          // Retry the request with the new CSRF token (interceptor will add it)
          return rawHttpClient(originalRequest);
        } catch {
          // If fetching CSRF token fails, reject with original error
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  },
);

export async function getHealthStatus(): Promise<HealthStatusResponse> {
  const res = await apiClient.get<HealthStatusResponse>("/health");
  return res.data;
}

export type SubmitContactRequest = {
  email: string;
  topic: string;
  message: string;
};

export type SubmitContactResponse = {
  success: boolean;
  data: {
    id: string;
    createdAt: string;
  };
};

export async function submitContact(payload: SubmitContactRequest): Promise<SubmitContactResponse> {
  // Public endpoint - no authentication required
  const res = await rawHttpClient.post<SubmitContactResponse>("/api/v1/contact", payload);
  return res.data;
}

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  username: string;
  terms_accepted: boolean;
  profile?: {
    display_name?: string;
  };
};

export type UserResponse = {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  role?: string;
};

export type UserStatus = "pending_verification" | "active" | "archived" | "pending_deletion";

export interface UserAvatar {
  url: string;
  mimeType: string | null;
  bytes: number | null;
  updatedAt: string | null;
}

export interface UserDetail {
  id: string;
  username: string;
  displayName: string;
  locale: string;
  preferredLang: string;
  defaultVisibility: string;
  units: string;
  role: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  primaryEmail: string | null;
  phoneNumber: string | null;
  avatar: UserAvatar | null;
  contacts: Array<{
    id: string;
    type: "email" | "phone";
    value: string;
    isPrimary: boolean;
    isRecovery: boolean;
    isVerified: boolean;
    verifiedAt: string | null;
    createdAt: string;
  }>;
  profile?: {
    alias: string | null;
    bio: string | null;
    weight: number | null;
    weightUnit: string | null;
    fitnessLevel: string | null;
    trainingFrequency: string | null;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  alias?: string | null;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
}

export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
  locale?: string;
  preferredLang?: string;
  defaultVisibility?: string;
  units?: string;
  alias?: string;
  bio?: string;
  weight?: number;
  weightUnit?: "kg" | "lb";
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  trainingFrequency?: "rarely" | "1_2_per_week" | "3_4_per_week" | "5_plus_per_week";
}

export type LoginResponse =
  | {
      requires2FA: false;
      user: UserResponse;
      session: unknown;
    }
  | {
      requires2FA: true;
      pendingSessionId: string;
    };

export type RegisterResponse = {
  user: UserResponse;
  session: unknown;
};

export type Verify2FAResponse = {
  user: UserResponse;
  session: unknown;
};

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  // Backend sets HttpOnly cookies (accessToken, refreshToken) and returns user data
  const res = await rawHttpClient.post<LoginResponse>("/api/v1/auth/login", payload);
  return res.data;
}

export type Verify2FALoginRequest = {
  pendingSessionId: string;
  code: string;
};

export async function verify2FALogin(payload: Verify2FALoginRequest): Promise<Verify2FAResponse> {
  // Backend sets HttpOnly cookies (accessToken, refreshToken) and returns user data
  const res = await rawHttpClient.post<Verify2FAResponse>("/api/v1/auth/login/verify-2fa", payload);
  return res.data;
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  // Backend sets HttpOnly cookies (accessToken, refreshToken) and returns user data
  const res = await rawHttpClient.post<RegisterResponse>("/api/v1/auth/register", payload);
  return res.data;
}

export type AcceptTermsRequest = {
  terms_accepted: boolean;
};

export type AcceptTermsResponse = {
  message: string;
};

export async function acceptTerms(payload: AcceptTermsRequest): Promise<AcceptTermsResponse> {
  const res = await apiClient.post<AcceptTermsResponse>("/api/v1/auth/terms/accept", payload);
  return res.data;
}

export type RevokeTermsResponse = {
  message: string;
};

export async function revokeTerms(): Promise<RevokeTermsResponse> {
  const res = await apiClient.post<RevokeTermsResponse>("/api/v1/auth/terms/revoke");
  return res.data;
}

export type AcceptPrivacyPolicyRequest = {
  privacy_policy_accepted: boolean;
};

export type AcceptPrivacyPolicyResponse = {
  message: string;
};

export async function acceptPrivacyPolicy(
  payload: AcceptPrivacyPolicyRequest,
): Promise<AcceptPrivacyPolicyResponse> {
  const res = await apiClient.post<AcceptPrivacyPolicyResponse>(
    "/api/v1/auth/privacy/accept",
    payload,
  );
  return res.data;
}

export type RevokePrivacyPolicyResponse = {
  message: string;
};

export async function revokePrivacyPolicy(): Promise<RevokePrivacyPolicyResponse> {
  const res = await apiClient.post<RevokePrivacyPolicyResponse>("/api/v1/auth/privacy/revoke");
  return res.data;
}

export interface LegalDocumentsStatus {
  terms: {
    accepted: boolean;
    acceptedAt: string | null;
    acceptedVersion: string | null;
    currentVersion: string;
    needsAcceptance: boolean;
  };
  privacy: {
    accepted: boolean;
    acceptedAt: string | null;
    acceptedVersion: string | null;
    currentVersion: string;
    needsAcceptance: boolean;
  };
}

export async function getLegalDocumentsStatus(): Promise<LegalDocumentsStatus> {
  const res = await apiClient.get<LegalDocumentsStatus>("/api/v1/auth/legal-documents/status");
  return res.data;
}

export type ResendVerificationRequest = {
  email: string;
};

export type ResendVerificationResponse = {
  message: string;
};

export async function resendVerificationEmail(
  payload: ResendVerificationRequest,
): Promise<ResendVerificationResponse> {
  const res = await rawHttpClient.post<ResendVerificationResponse>(
    "/api/v1/auth/verify/resend",
    payload,
  );
  return res.data;
}

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export async function forgotPassword(
  payload: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  const res = await rawHttpClient.post<ForgotPasswordResponse>(
    "/api/v1/auth/password/forgot",
    payload,
  );
  return res.data;
}

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export async function resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const res = await rawHttpClient.post<ResetPasswordResponse>(
    "/api/v1/auth/password/reset",
    payload,
  );
  return res.data;
}

/**
 * Logout function - calls backend to invalidate session and clear cookies
 * Backend clears HttpOnly cookies automatically
 */
export async function logout(): Promise<void> {
  await rawHttpClient.post("/api/v1/auth/logout");
}

// User Profile API
export async function getCurrentUser(): Promise<UserDetail> {
  const res = await apiClient.get<UserDetail>("/api/v1/users/me");
  return res.data;
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<UserDetail> {
  const res = await apiClient.patch<UserDetail>("/api/v1/users/me", payload);
  return res.data;
}

// Session Management API
export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}

export interface SessionsListResponse {
  sessions: SessionInfo[];
}

export interface RevokeSessionsRequest {
  sessionId?: string | null;
  revokeAll?: boolean;
  revokeOthers?: boolean;
}

export interface RevokeSessionsResponse {
  revoked: number;
}

/**
 * List all active sessions for the current user
 */
export async function listAuthSessions(): Promise<SessionsListResponse> {
  const res = await apiClient.get<SessionsListResponse>("/api/v1/auth/sessions");
  return res.data;
}

/**
 * Revoke one or more sessions
 */
export async function revokeAuthSessions(
  payload: RevokeSessionsRequest,
): Promise<RevokeSessionsResponse> {
  const res = await apiClient.post<RevokeSessionsResponse>("/api/v1/auth/sessions/revoke", payload);
  return res.data;
}

export type DashboardRange = "4w" | "8w";
export type DashboardGrain = "weekly" | "monthly";

export type DashboardSummaryMetric = {
  id: string;
  label: string;
  value: string | number;
  trend?: string;
};

export type DashboardPersonalRecord = {
  lift: string;
  value: string;
  achieved: string;
  visibility: "public" | "link" | "private";
};

export type DashboardAggregateRow = {
  period: string;
  volume: number;
  sessions: number;
};

export type DashboardAnalyticsMeta = {
  range: DashboardRange;
  grain: DashboardGrain;
  totalRows: number;
  truncated: boolean;
};

export type DashboardAnalyticsResponse = {
  summary: DashboardSummaryMetric[];
  personalRecords: DashboardPersonalRecord[];
  aggregates: DashboardAggregateRow[];
  meta: DashboardAnalyticsMeta;
};

const MAX_ANALYTIC_ROWS = 5;

export async function getDashboardAnalytics(params: {
  range: DashboardRange;
  grain: DashboardGrain;
}): Promise<DashboardAnalyticsResponse> {
  // Call the actual progress endpoints
  const period = params.range === "4w" ? 30 : 60;
  const groupBy = params.grain === "weekly" ? "week" : "day";

  const [summaryRes, trendsRes] = await Promise.all([
    apiClient.get<ProgressSummary>("/api/v1/progress/summary", { params: { period } }),
    apiClient.get<TrendDataPoint[]>("/api/v1/progress/trends", {
      params: { period, group_by: groupBy },
    }),
  ]);

  const summary = summaryRes.data;
  const trends = trendsRes.data;

  // Transform backend data to dashboard format
  const summaryMetrics: DashboardSummaryMetric[] = [
    {
      id: "streak",
      label: "Training streak",
      value: summary.currentStreak ? `${summary.currentStreak} days` : "0 days",
      trend: summary.streakChange
        ? `${summary.streakChange > 0 ? "+" : ""}${summary.streakChange} vs last period`
        : "",
    },
    {
      id: "sessions",
      label: "Sessions completed",
      value: summary.totalSessions?.toString() || "0",
      trend: summary.sessionsChange
        ? `${summary.sessionsChange > 0 ? "+" : ""}${summary.sessionsChange} vs last period`
        : "",
    },
    {
      id: "volume",
      label: "Total volume",
      value: summary.totalVolume ? `${(summary.totalVolume / 1000).toFixed(1)}k kg` : "0 kg",
      trend: summary.volumeChange
        ? `${summary.volumeChange > 0 ? "+" : ""}${(summary.volumeChange / 1000).toFixed(1)}k kg vs last period`
        : "",
    },
  ];

  const personalRecords: DashboardPersonalRecord[] = (summary.personalRecords || [])
    .slice(0, 3)
    .map((pr) => ({
      lift: pr.exerciseName || "Unknown",
      value: pr.value ? `${pr.value} ${pr.unit || "kg"}` : "-",
      achieved: pr.achievedAt || "Unknown",
      visibility: (pr.visibility as "public" | "link" | "private") || "private",
    }));

  const aggregates: DashboardAggregateRow[] = (trends || [])
    .slice(0, MAX_ANALYTIC_ROWS)
    .map((row, index: number) => ({
      period: row.label || `Week ${index + 1}`,
      volume: row.volume,
      sessions: row.sessions,
    }));

  return {
    summary: summaryMetrics,
    personalRecords,
    aggregates,
    meta: {
      range: params.range,
      grain: params.grain,
      totalRows: trends?.length || 0,
      truncated: trends?.length > MAX_ANALYTIC_ROWS,
    },
  };
}

// Feed API
export interface FeedItem {
  id: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
  };
  session: {
    id: string;
    title?: string;
    notes?: string;
    plannedAt: string;
    completedAt?: string;
    exerciseCount: number;
    totalVolume?: number;
  };
  visibility: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
  total: number;
}

// Follow/Unfollow API
export interface FollowUserResponse {
  followingId: string;
}

export interface UnfollowUserResponse {
  unfollowedId: string;
}

export async function followUser(alias: string): Promise<FollowUserResponse> {
  const res = await apiClient.post<FollowUserResponse>(`/api/v1/users/${alias}/follow`);
  return res.data;
}

export async function unfollowUser(alias: string): Promise<UnfollowUserResponse> {
  const res = await apiClient.delete<UnfollowUserResponse>(`/api/v1/users/${alias}/follow`);
  return res.data;
}

export async function getFeed(
  params: { scope?: string; limit?: number; offset?: number } = {},
): Promise<FeedResponse> {
  const res = await apiClient.get<FeedResponse>("/api/v1/feed", { params });
  return res.data;
}

export async function likeFeedItem(feedItemId: string): Promise<void> {
  await apiClient.post(`/api/v1/feed/item/${feedItemId}/like`);
}

export async function unlikeFeedItem(feedItemId: string): Promise<void> {
  await apiClient.delete(`/api/v1/feed/item/${feedItemId}/like`);
}

export async function cloneSessionFromFeed(sessionId: string): Promise<{ sessionId: string }> {
  const res = await apiClient.post<{ sessionId: string }>(
    `/api/v1/feed/session/${sessionId}/clone`,
  );
  return res.data;
}

// Progress API
export interface ProgressSummary {
  totalSessions: number;
  totalVolume: number;
  currentStreak: number;
  personalRecords?: Array<{
    exerciseName: string;
    value: number;
    unit: string;
    achievedAt: string;
    visibility: string;
  }>;
  streakChange?: number;
  sessionsChange?: number;
  volumeChange?: number;
}

export interface TrendDataPoint {
  label: string;
  date: string;
  volume: number;
  sessions: number;
  avgIntensity: number;
}

export interface ExerciseStats {
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  totalVolume: number;
  avgVolume: number;
  maxWeight: number;
  trend: "up" | "down" | "stable";
}

export interface ExerciseBreakdown {
  exercises: ExerciseStats[];
  period: number;
}

export interface VibePointsTrendPoint {
  month: string;
  points: number;
}

export interface VibePointsSeries {
  type_code: string;
  points: number;
  trend: VibePointsTrendPoint[];
}

export interface VibePointsResponse {
  period_months: number;
  months: string[];
  overall: {
    points: number;
    trend: VibePointsTrendPoint[];
  };
  vibes: VibePointsSeries[];
}

export async function getProgressSummary(period: number = 30): Promise<ProgressSummary> {
  const res = await apiClient.get<ProgressSummary>("/api/v1/progress/summary", {
    params: { period },
  });
  return res.data;
}

export async function getProgressTrends(params: {
  period?: number;
  group_by?: "day" | "week";
  from?: string; // ISO date string
  to?: string; // ISO date string
}): Promise<TrendDataPoint[]> {
  const res = await apiClient.get<TrendDataPoint[]>("/api/v1/progress/trends", { params });
  return res.data;
}

export async function getExerciseBreakdown(params: {
  period?: number;
  from?: string; // ISO date string
  to?: string; // ISO date string
}): Promise<ExerciseBreakdown> {
  const res = await apiClient.get<ExerciseBreakdown>("/api/v1/progress/exercises", { params });
  return res.data;
}

export async function getVibePoints(periodMonths: number = 12): Promise<VibePointsResponse> {
  const res = await apiClient.get<VibePointsResponse>("/api/v1/progress/vibes", {
    params: { months: periodMonths },
  });
  return res.data;
}

export async function exportProgress(): Promise<Blob> {
  const res = await apiClient.get<Blob>("/api/v1/progress/export", {
    responseType: "blob",
  });
  return res.data;
}

// Exercises API
export interface Exercise {
  id: string;
  name: string;
  type_code: string | null;
  owner_id: string | null;
  muscle_group: string | null;
  equipment: string | null;
  tags: string[];
  is_public: boolean;
  description_en: string | null;
  description_de: string | null;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
}

export interface CreateExerciseRequest {
  name: string;
  type_code: string;
  muscle_group?: string | null;
  equipment?: string | null;
  tags?: string[];
  is_public?: boolean;
  description_en?: string | null;
  description_de?: string | null;
}

export interface UpdateExerciseRequest {
  name?: string;
  type_code?: string;
  muscle_group?: string | null;
  equipment?: string | null;
  tags?: string[];
  is_public?: boolean;
  description_en?: string | null;
  description_de?: string | null;
}

export interface ExerciseQuery {
  q?: string;
  type_code?: string;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
  owner_id?: string | null;
  muscle_group?: string;
  equipment?: string;
  tags?: string[];
  is_public?: boolean;
}

export interface ExercisesListResponse {
  data: Exercise[];
  total: number;
  limit: number;
  offset: number;
}

export async function listExercises(params?: ExerciseQuery): Promise<ExercisesListResponse> {
  const res = await apiClient.get<ExercisesListResponse>("/api/v1/exercises", { params });
  return res.data;
}

export async function getExercise(exerciseId: string): Promise<Exercise> {
  const res = await apiClient.get<Exercise>(`/api/v1/exercises/${exerciseId}`);
  return res.data;
}

export async function createExercise(payload: CreateExerciseRequest): Promise<Exercise> {
  const res = await apiClient.post<Exercise>("/api/v1/exercises", payload);
  return res.data;
}

export async function updateExercise(
  exerciseId: string,
  payload: UpdateExerciseRequest,
): Promise<Exercise> {
  const res = await apiClient.put<Exercise>(`/api/v1/exercises/${exerciseId}`, payload);
  return res.data;
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  await apiClient.delete(`/api/v1/exercises/${exerciseId}`);
}

// Sessions API (extending from earlier types)
export type SessionStatus = "planned" | "in_progress" | "completed" | "canceled";
export type SessionVisibility = "private" | "public" | "link";

export interface SessionExerciseAttributes {
  sets?: number | null;
  reps?: number | null;
  load?: number | null;
  distance?: number | null;
  duration?: string | null;
  rpe?: number | null;
  rest?: string | null;
  extras?: Record<string, unknown>;
}

export interface SessionExerciseActualAttributes extends SessionExerciseAttributes {
  recorded_at?: string | null;
}

export interface SessionExerciseSet {
  id: string;
  order_index: number;
  reps?: number | null;
  weight_kg?: number | null;
  distance_m?: number | null;
  duration_sec?: number | null;
  rpe?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id?: string | null;
  order_index: number;
  notes?: string | null;
  planned?: SessionExerciseAttributes | null;
  actual?: SessionExerciseActualAttributes | null;
  sets: SessionExerciseSet[];
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  id: string;
  owner_id: string;
  plan_id?: string | null;
  title?: string | null;
  planned_at: string;
  status: SessionStatus;
  visibility: SessionVisibility;
  notes?: string | null;
  recurrence_rule?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  calories?: number | null;
  points?: number | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SessionWithExercises extends Session {
  exercises: SessionExercise[];
}

export interface SessionQuery {
  status?: SessionStatus;
  plan_id?: string;
  planned_from?: string;
  planned_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SessionsListResponse {
  data: SessionWithExercises[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionExerciseInput {
  id?: string;
  exercise_id?: string | null;
  order: number;
  notes?: string | null;
  planned?: SessionExerciseAttributes | null;
  actual?: SessionExerciseActualAttributes | null;
  sets?: Array<{
    id?: string;
    order: number;
    reps?: number | null;
    weight_kg?: number | null;
    distance_m?: number | null;
    duration_sec?: number | null;
    rpe?: number | null;
    notes?: string | null;
  }>;
}

export interface CreateSessionRequest {
  plan_id?: string | null;
  title?: string | null;
  planned_at: string;
  visibility?: SessionVisibility;
  notes?: string | null;
  recurrence_rule?: string | null;
  exercises?: SessionExerciseInput[];
}

export interface UpdateSessionRequest {
  plan_id?: string | null;
  title?: string | null;
  planned_at?: string;
  status?: SessionStatus;
  visibility?: SessionVisibility;
  notes?: string | null;
  recurrence_rule?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  calories?: number | null;
  exercises?: SessionExerciseInput[];
}

export interface CloneSessionRequest {
  planned_at?: string;
  date_offset_days?: number;
  title?: string | null;
  notes?: string | null;
  visibility?: SessionVisibility;
  recurrence_rule?: string | null;
  plan_id?: string | null;
  include_actual?: boolean;
}

export async function listSessions(params?: SessionQuery): Promise<SessionsListResponse> {
  const res = await apiClient.get<SessionsListResponse>("/api/v1/sessions", { params });
  return res.data;
}

export async function getSession(sessionId: string): Promise<SessionWithExercises> {
  const res = await apiClient.get<SessionWithExercises>(`/api/v1/sessions/${sessionId}`);
  return res.data;
}

export async function createSession(payload: CreateSessionRequest): Promise<SessionWithExercises> {
  const res = await apiClient.post<SessionWithExercises>("/api/v1/sessions", payload);
  return res.data;
}

export async function updateSession(
  sessionId: string,
  payload: UpdateSessionRequest,
): Promise<SessionWithExercises> {
  const res = await apiClient.patch<SessionWithExercises>(`/api/v1/sessions/${sessionId}`, payload);
  return res.data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/v1/sessions/${sessionId}`);
}

export async function cloneSession(
  sessionId: string,
  payload?: CloneSessionRequest,
): Promise<SessionWithExercises> {
  const res = await apiClient.post<SessionWithExercises>(
    `/api/v1/sessions/${sessionId}/clone`,
    payload ?? {},
  );
  return res.data;
}

// Admin & System API
export interface SystemReadOnlyStatus {
  readOnlyMode: boolean;
  message: string | null;
  timestamp: string;
}

export interface EnableReadOnlyRequest {
  reason?: string;
  estimatedDuration?: string;
}

export interface DisableReadOnlyRequest {
  notes?: string;
}

export async function getSystemReadOnlyStatus(): Promise<SystemReadOnlyStatus> {
  const res = await apiClient.get<SystemReadOnlyStatus>("/api/v1/system/read-only/status");
  return res.data;
}

export async function enableReadOnlyMode(
  payload: EnableReadOnlyRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    "/api/v1/system/read-only/enable",
    payload,
  );
  return res.data;
}

export async function disableReadOnlyMode(
  payload: DisableReadOnlyRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    "/api/v1/system/read-only/disable",
    payload,
  );
  return res.data;
}

// Admin - Content Reports API
export interface FeedReport {
  id: string;
  reporterUsername: string;
  feedItemId?: string;
  commentId?: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: string;
  contentPreview: string;
  contentAuthor: string;
}

export interface FeedReportsQuery {
  status?: "all" | "pending" | "reviewed" | "dismissed";
  limit?: number;
  offset?: number;
}

export interface FeedReportsResponse {
  data: FeedReport[];
  total: number;
  limit: number;
  offset: number;
}

export interface ModerateContentRequest {
  action: "hide" | "dismiss" | "ban";
  notes?: string;
}

export async function getFeedReports(params?: FeedReportsQuery): Promise<FeedReportsResponse> {
  const res = await apiClient.get<FeedReportsResponse>("/api/v1/admin/reports", { params });
  return res.data;
}

export async function moderateContent(
  reportId: string,
  payload: ModerateContentRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/admin/reports/${reportId}/moderate`,
    payload,
  );
  return res.data;
}

// Admin - User Management API
export interface UserRecord {
  id: string;
  username: string;
  displayName?: string | null;
  email: string;
  roleCode: string;
  status: "active" | "suspended" | "banned";
  createdAt: string;
  deactivatedAt: string | null;
  lastLoginAt: string | null;
  sessionCount: number;
  reportCount: number;
}

export interface UserSearchQuery {
  q: string;
  limit?: number;
  offset?: number;
  blacklisted?: boolean;
}

export interface UserSearchResponse {
  data: UserRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserActionRequest {
  reason?: string;
  notes?: string;
}

export async function searchUsers(params: UserSearchQuery): Promise<UserSearchResponse> {
  const res = await apiClient.get<UserSearchResponse>("/api/v1/admin/users/search", { params });
  return res.data;
}

export async function suspendUser(
  userId: string,
  payload?: UserActionRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/admin/users/${userId}/suspend`,
    payload ?? {},
  );
  return res.data;
}

export async function banUser(
  userId: string,
  payload?: UserActionRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/admin/users/${userId}/ban`,
    payload ?? {},
  );
  return res.data;
}

export async function activateUser(
  userId: string,
  payload?: UserActionRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/admin/users/${userId}/activate`,
    payload ?? {},
  );
  return res.data;
}

export async function blacklistUser(
  userId: string,
  payload?: UserActionRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/admin/users/${userId}/action`,
    { action: "blacklist", ...payload },
  );
  return res.data;
}

export async function unblacklistUser(
  userId: string,
  payload?: UserActionRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/api/v1/admin/users/${userId}/action`,
    { action: "unblacklist", ...payload },
  );
  return res.data;
}

export async function deleteUser(
  userId: string,
  payload?: UserActionRequest,
): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete<{ success: boolean; message: string }>(
    `/api/v1/admin/users/${userId}`,
    { data: payload },
  );
  return res.data;
}

// Two-Factor Authentication API
export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  message: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  backupCodesRemaining?: number;
}

export async function setup2FA(): Promise<TwoFactorSetupResponse> {
  const res = await apiClient.get<TwoFactorSetupResponse>("/api/v1/auth/2fa/setup");
  return res.data;
}

export async function verify2FA(code: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    "/api/v1/auth/2fa/verify",
    { code },
  );
  return res.data;
}

export async function disable2FA(password: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    "/api/v1/auth/2fa/disable",
    { password },
  );
  return res.data;
}

export async function get2FAStatus(): Promise<TwoFactorStatusResponse> {
  const res = await apiClient.get<TwoFactorStatusResponse>("/api/v1/auth/2fa/status");
  return res.data;
}

// Avatar Upload API
export interface AvatarUploadResponse {
  success: boolean;
  fileUrl: string;
  bytes: number;
  mimeType: string;
  updatedAt: string;
  preview?: string;
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
  const formData = new FormData();
  formData.append("avatar", file);

  // Don't set Content-Type header - let the browser set it with the correct boundary
  // Route is /api/v1/users/avatar (not /me/avatar) - the backend uses req.user to identify the user
  const res = await apiClient.post<AvatarUploadResponse>("/api/v1/users/avatar", formData);
  return res.data;
}

// Session Management API
export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}
