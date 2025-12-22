import MockAdapter from "axios-mock-adapter";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  apiClient,
  rawHttpClient,
  getHealthStatus,
  login,
  register,
  verify2FALogin,
  forgotPassword,
  resetPassword,
  getFeed,
  likeFeedItem,
  unlikeFeedItem,
  cloneSessionFromFeed,
  getProgressSummary,
  getProgressTrends,
  getExerciseBreakdown,
  exportProgress,
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  cloneSession,
  getSystemReadOnlyStatus,
  enableReadOnlyMode,
  disableReadOnlyMode,
  getFeedReports,
  moderateContent,
  searchUsers,
  suspendUser,
  banUser,
  activateUser,
  deleteUser,
  setup2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
  getDashboardAnalytics,
} from "../../src/services/api";

describe("API Service Functions", () => {
  let apiMock: MockAdapter;
  let rawMock: MockAdapter;

  beforeEach(() => {
    apiMock = new MockAdapter(apiClient);
    rawMock = new MockAdapter(rawHttpClient);
  });

  afterEach(() => {
    apiMock.restore();
    rawMock.restore();
    vi.restoreAllMocks();
  });

  describe("getHealthStatus", () => {
    it("should fetch health status", async () => {
      const mockResponse = { status: "ok", uptime: 3600, version: "1.0.0" };
      apiMock.onGet("/health").reply(200, mockResponse);

      const result = await getHealthStatus();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("login", () => {
    it("should login successfully", async () => {
      const mockResponse = {
        requires2FA: false,
        user: { id: "1", username: "test", email: "test@example.com" },
        session: { id: "session-1" },
      };
      // login uses rawHttpClient, not apiClient
      rawMock.onPost("/api/v1/auth/login").reply(200, mockResponse);

      const result = await login({ email: "test@example.com", password: "password123" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("register", () => {
    it("should register successfully", async () => {
      const mockResponse = {
        user: { id: "1", username: "test", email: "test@example.com" },
        session: { id: "session-1" },
      };
      // register uses rawHttpClient
      rawMock.onPost("/api/v1/auth/register").reply(200, mockResponse);

      const result = await register({
        email: "test@example.com",
        password: "password123",
        username: "test",
        terms_accepted: true,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("verify2FALogin", () => {
    it("should verify 2FA login", async () => {
      const mockResponse = {
        user: { id: "1", username: "test", email: "test@example.com" },
        session: { id: "session-1" },
      };
      // verify2FALogin uses rawHttpClient
      rawMock.onPost("/api/v1/auth/login/verify-2fa").reply(200, mockResponse);

      const result = await verify2FALogin({ pendingSessionId: "session-1", code: "123456" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("forgotPassword", () => {
    it("should send forgot password request", async () => {
      const mockResponse = { message: "Password reset email sent" };
      // forgotPassword uses rawHttpClient
      rawMock.onPost("/api/v1/auth/password/forgot").reply(200, mockResponse);

      const result = await forgotPassword({ email: "test@example.com" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("resetPassword", () => {
    it("should reset password", async () => {
      const mockResponse = { message: "Password reset successfully" };
      // resetPassword uses rawHttpClient
      rawMock.onPost("/api/v1/auth/password/reset").reply(200, mockResponse);

      const result = await resetPassword({ token: "token-123", newPassword: "newpass123" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getFeed", () => {
    it("should fetch feed items", async () => {
      const mockResponse = { items: [], total: 0 };
      apiMock.onGet("/api/v1/feed").reply(200, mockResponse);

      const result = await getFeed();

      expect(result).toEqual(mockResponse);
    });

    it("should fetch feed with params", async () => {
      const mockResponse = { items: [], total: 0 };
      apiMock.onGet("/api/v1/feed").reply(200, mockResponse);

      const result = await getFeed({ scope: "public", limit: 10, offset: 0 });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("likeFeedItem", () => {
    it("should like a feed item", async () => {
      apiMock.onPost("/api/v1/feed/item/item-1/like").reply(200);

      await likeFeedItem("item-1");

      expect(apiMock.history.post[0]?.url).toBe("/api/v1/feed/item/item-1/like");
    });
  });

  describe("unlikeFeedItem", () => {
    it("should unlike a feed item", async () => {
      apiMock.onDelete("/api/v1/feed/item/item-1/like").reply(200);

      await unlikeFeedItem("item-1");

      expect(apiMock.history.delete[0]?.url).toBe("/api/v1/feed/item/item-1/like");
    });
  });

  describe("cloneSessionFromFeed", () => {
    it("should clone session from feed", async () => {
      const mockResponse = { sessionId: "session-2" };
      apiMock.onPost("/api/v1/feed/session/session-1/clone").reply(200, mockResponse);

      const result = await cloneSessionFromFeed("session-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getProgressSummary", () => {
    it("should fetch progress summary", async () => {
      const mockResponse = {
        totalSessions: 10,
        totalVolume: 1000,
        currentStreak: 5,
      };
      apiMock.onGet("/api/v1/progress/summary").reply(200, mockResponse);

      const result = await getProgressSummary(30);

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getProgressTrends", () => {
    it("should fetch progress trends", async () => {
      const mockResponse = [
        { label: "Week 1", date: "2025-01-01", volume: 100, sessions: 3, avgIntensity: 7 },
      ];
      apiMock.onGet("/api/v1/progress/trends").reply(200, mockResponse);

      const result = await getProgressTrends({ period: 30, group_by: "week" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getExerciseBreakdown", () => {
    it("should fetch exercise breakdown", async () => {
      const mockResponse = {
        exercises: [],
        period: 30,
      };
      apiMock.onGet("/api/v1/progress/exercises").reply(200, mockResponse);

      const result = await getExerciseBreakdown({ period: 30 });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("exportProgress", () => {
    it("should export progress data", async () => {
      const mockBlob = new Blob(["test data"], { type: "application/json" });
      apiMock.onGet("/api/v1/progress/export").reply(200, mockBlob);

      const result = await exportProgress();

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe("listExercises", () => {
    it("should list exercises", async () => {
      const mockResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
      };
      apiMock.onGet("/api/v1/exercises").reply(200, mockResponse);

      const result = await listExercises();

      expect(result).toEqual(mockResponse);
    });

    it("should list exercises with query params", async () => {
      const mockResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
      };
      apiMock.onGet("/api/v1/exercises").reply(200, mockResponse);

      const result = await listExercises({ q: "bench", type_code: "strength" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getExercise", () => {
    it("should get exercise by id", async () => {
      const mockResponse = {
        id: "exercise-1",
        name: "Bench Press",
        type_code: "strength",
        owner_id: null,
        muscle_group: "chest",
        equipment: "barbell",
        tags: [],
        is_public: true,
        description_en: null,
        description_de: null,
      };
      apiMock.onGet("/api/v1/exercises/exercise-1").reply(200, mockResponse);

      const result = await getExercise("exercise-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("createExercise", () => {
    it("should create exercise", async () => {
      const mockResponse = {
        id: "exercise-1",
        name: "Bench Press",
        type_code: "strength",
        owner_id: null,
        muscle_group: "chest",
        equipment: "barbell",
        tags: [],
        is_public: true,
        description_en: null,
        description_de: null,
      };
      apiMock.onPost("/api/v1/exercises").reply(200, mockResponse);

      const result = await createExercise({
        name: "Bench Press",
        type_code: "strength",
        muscle_group: "chest",
        equipment: "barbell",
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateExercise", () => {
    it("should update exercise", async () => {
      const mockResponse = {
        id: "exercise-1",
        name: "Updated Bench Press",
        type_code: "strength",
        owner_id: null,
        muscle_group: "chest",
        equipment: "barbell",
        tags: [],
        is_public: true,
        description_en: null,
        description_de: null,
      };
      apiMock.onPut("/api/v1/exercises/exercise-1").reply(200, mockResponse);

      const result = await updateExercise("exercise-1", { name: "Updated Bench Press" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteExercise", () => {
    it("should delete exercise", async () => {
      apiMock.onDelete("/api/v1/exercises/exercise-1").reply(200);

      await deleteExercise("exercise-1");

      expect(apiMock.history.delete[0]?.url).toBe("/api/v1/exercises/exercise-1");
    });
  });

  describe("listSessions", () => {
    it("should list sessions", async () => {
      const mockResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
      };
      apiMock.onGet("/api/v1/sessions").reply(200, mockResponse);

      const result = await listSessions();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getSession", () => {
    it("should get session by id", async () => {
      const mockResponse = {
        id: "session-1",
        owner_id: "user-1",
        planned_at: "2025-01-01T00:00:00Z",
        status: "planned",
        visibility: "private",
        exercises: [],
      };
      apiMock.onGet("/api/v1/sessions/session-1").reply(200, mockResponse);

      const result = await getSession("session-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("createSession", () => {
    it("should create session", async () => {
      const mockResponse = {
        id: "session-1",
        owner_id: "user-1",
        planned_at: "2025-01-01T00:00:00Z",
        status: "planned",
        visibility: "private",
        exercises: [],
      };
      apiMock.onPost("/api/v1/sessions").reply(200, mockResponse);

      const result = await createSession({
        planned_at: "2025-01-01T00:00:00Z",
        visibility: "private",
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateSession", () => {
    it("should update session", async () => {
      const mockResponse = {
        id: "session-1",
        owner_id: "user-1",
        planned_at: "2025-01-01T00:00:00Z",
        status: "completed",
        visibility: "private",
        exercises: [],
      };
      apiMock.onPatch("/api/v1/sessions/session-1").reply(200, mockResponse);

      const result = await updateSession("session-1", { status: "completed" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteSession", () => {
    it("should delete session", async () => {
      apiMock.onDelete("/api/v1/sessions/session-1").reply(200);

      await deleteSession("session-1");

      expect(apiMock.history.delete[0]?.url).toBe("/api/v1/sessions/session-1");
    });
  });

  describe("cloneSession", () => {
    it("should clone session", async () => {
      const mockResponse = {
        id: "session-2",
        owner_id: "user-1",
        planned_at: "2025-01-02T00:00:00Z",
        status: "planned",
        visibility: "private",
        exercises: [],
      };
      apiMock.onPost("/api/v1/sessions/session-1/clone").reply(200, mockResponse);

      const result = await cloneSession("session-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getSystemReadOnlyStatus", () => {
    it("should get system read-only status", async () => {
      const mockResponse = {
        readOnlyMode: false,
        message: null,
        timestamp: "2025-01-01T00:00:00Z",
      };
      apiMock.onGet("/api/v1/system/read-only/status").reply(200, mockResponse);

      const result = await getSystemReadOnlyStatus();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("enableReadOnlyMode", () => {
    it("should enable read-only mode", async () => {
      const mockResponse = { success: true, message: "Read-only mode enabled" };
      apiMock.onPost("/api/v1/system/read-only/enable").reply(200, mockResponse);

      const result = await enableReadOnlyMode({ reason: "Maintenance" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("disableReadOnlyMode", () => {
    it("should disable read-only mode", async () => {
      const mockResponse = { success: true, message: "Read-only mode disabled" };
      apiMock.onPost("/api/v1/system/read-only/disable").reply(200, mockResponse);

      const result = await disableReadOnlyMode({ notes: "Maintenance complete" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getFeedReports", () => {
    it("should get feed reports", async () => {
      const mockResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
      };
      apiMock.onGet("/api/v1/admin/reports").reply(200, mockResponse);

      const result = await getFeedReports();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("moderateContent", () => {
    it("should moderate content", async () => {
      const mockResponse = { success: true, message: "Content moderated" };
      apiMock.onPost("/api/v1/admin/reports/report-1/moderate").reply(200, mockResponse);

      const result = await moderateContent("report-1", { action: "hide" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("searchUsers", () => {
    it("should search users", async () => {
      const mockResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
      };
      apiMock.onGet("/api/v1/admin/users/search").reply(200, mockResponse);

      const result = await searchUsers({ q: "test" });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("suspendUser", () => {
    it("should suspend user", async () => {
      const mockResponse = { success: true, message: "User suspended" };
      // Match any body (empty object or any payload)
      apiMock.onPost("/api/v1/admin/users/user-1/suspend").reply((config) => {
        return [200, mockResponse];
      });

      const result = await suspendUser("user-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("banUser", () => {
    it("should ban user", async () => {
      const mockResponse = { success: true, message: "User banned" };
      apiMock.onPost("/api/v1/admin/users/user-1/ban").reply(200, mockResponse);

      const result = await banUser("user-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("activateUser", () => {
    it("should activate user", async () => {
      const mockResponse = { success: true, message: "User activated" };
      apiMock.onPost("/api/v1/admin/users/user-1/activate").reply(200, mockResponse);

      const result = await activateUser("user-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteUser", () => {
    it("should delete user", async () => {
      const mockResponse = { success: true, message: "User deleted" };
      apiMock.onDelete("/api/v1/admin/users/user-1").reply(200, mockResponse);

      const result = await deleteUser("user-1");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("setup2FA", () => {
    it("should setup 2FA", async () => {
      const mockResponse = {
        secret: "secret",
        qrCode: "data:image/png;base64,...",
        backupCodes: ["code1", "code2"],
        message: "2FA setup complete",
      };
      apiMock.onGet("/api/v1/auth/2fa/setup").reply(200, mockResponse);

      const result = await setup2FA();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("verify2FA", () => {
    it("should verify 2FA code", async () => {
      const mockResponse = { success: true, message: "2FA verified" };
      apiMock.onPost("/api/v1/auth/2fa/verify").reply(200, mockResponse);

      const result = await verify2FA("123456");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("disable2FA", () => {
    it("should disable 2FA", async () => {
      const mockResponse = { success: true, message: "2FA disabled" };
      apiMock.onPost("/api/v1/auth/2fa/disable").reply(200, mockResponse);

      const result = await disable2FA("password123");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("get2FAStatus", () => {
    it("should get 2FA status", async () => {
      const mockResponse = { enabled: true, backupCodesRemaining: 5 };
      apiMock.onGet("/api/v1/auth/2fa/status").reply(200, mockResponse);

      const result = await get2FAStatus();

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getDashboardAnalytics", () => {
    it("should get dashboard analytics", async () => {
      const summaryResponse = {
        totalSessions: 10,
        totalVolume: 1000,
        currentStreak: 5,
      };
      const trendsResponse = [
        { label: "Week 1", date: "2025-01-01", volume: 100, sessions: 3, avgIntensity: 7 },
      ];

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 30 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 30, group_by: "week" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "4w", grain: "weekly" });

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("aggregates");
      expect(result).toHaveProperty("meta");
    });

    it("should handle 8w range with monthly grain", async () => {
      const summaryResponse = {
        totalSessions: 20,
        totalVolume: 2000,
        currentStreak: 10,
      };
      const trendsResponse = [
        { label: "Month 1", date: "2025-01-01", volume: 200, sessions: 6, avgIntensity: 8 },
      ];

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 60 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 60, group_by: "day" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "8w", grain: "monthly" });

      expect(result.meta.range).toBe("8w");
      expect(result.meta.grain).toBe("monthly");
    });

    it("should handle null/undefined summary values", async () => {
      const summaryResponse = {
        totalSessions: null,
        totalVolume: null,
        currentStreak: null,
        streakChange: null,
        sessionsChange: null,
        volumeChange: null,
        personalRecords: null,
      };
      const trendsResponse: unknown[] = null;

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 30 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 30, group_by: "week" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "4w", grain: "weekly" });

      expect(result.summary[0].value).toBe("0 days");
      expect(result.summary[1].value).toBe("0");
      expect(result.summary[2].value).toBe("0 kg");
      expect(result.personalRecords).toEqual([]);
      expect(result.aggregates).toEqual([]);
      expect(result.meta.totalRows).toBe(0);
      expect(result.meta.truncated).toBe(false);
    });

    it("should handle negative streakChange and sessionsChange", async () => {
      const summaryResponse = {
        totalSessions: 10,
        totalVolume: 1000,
        currentStreak: 5,
        streakChange: -2,
        sessionsChange: -3,
        volumeChange: -500,
      };
      const trendsResponse: unknown[] = [];

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 30 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 30, group_by: "week" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "4w", grain: "weekly" });

      expect(result.summary[0].trend).toContain("-2 vs last period");
      expect(result.summary[1].trend).toContain("-3 vs last period");
      expect(result.summary[2].trend).toContain("-0.5k kg vs last period");
    });

    it("should handle personal records with missing fields", async () => {
      const summaryResponse = {
        totalSessions: 10,
        totalVolume: 1000,
        currentStreak: 5,
        personalRecords: [
          { exerciseName: null, value: null, unit: null, achievedAt: null, visibility: null },
          { exerciseName: "Bench Press", value: 100, unit: "kg", achievedAt: "2025-01-01" },
        ],
      };
      const trendsResponse: unknown[] = [];

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 30 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 30, group_by: "week" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "4w", grain: "weekly" });

      expect(result.personalRecords[0].lift).toBe("Unknown");
      expect(result.personalRecords[0].value).toBe("-");
      expect(result.personalRecords[0].achieved).toBe("Unknown");
      expect(result.personalRecords[0].visibility).toBe("private");
      expect(result.personalRecords[1].lift).toBe("Bench Press");
      expect(result.personalRecords[1].value).toBe("100 kg");
    });

    it("should truncate trends when exceeding MAX_ANALYTIC_ROWS", async () => {
      const summaryResponse = {
        totalSessions: 10,
        totalVolume: 1000,
        currentStreak: 5,
      };
      const trendsResponse = Array.from({ length: 10 }, (_, i) => ({
        label: `Week ${i + 1}`,
        date: `2025-01-${i + 1}`,
        volume: 100,
        sessions: 3,
        avgIntensity: 7,
      }));

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 30 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 30, group_by: "week" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "4w", grain: "weekly" });

      expect(result.aggregates).toHaveLength(5); // MAX_ANALYTIC_ROWS
      expect(result.meta.truncated).toBe(true);
      expect(result.meta.totalRows).toBe(10);
    });

    it("should handle trends with missing labels", async () => {
      const summaryResponse = {
        totalSessions: 10,
        totalVolume: 1000,
        currentStreak: 5,
      };
      const trendsResponse = [
        { label: null, date: "2025-01-01", volume: 100, sessions: 3, avgIntensity: 7 },
        { date: "2025-01-02", volume: 200, sessions: 4, avgIntensity: 8 },
      ];

      apiMock
        .onGet("/api/v1/progress/summary", { params: { period: 30 } })
        .reply(200, summaryResponse);
      apiMock
        .onGet("/api/v1/progress/trends", { params: { period: 30, group_by: "week" } })
        .reply(200, trendsResponse);

      const result = await getDashboardAnalytics({ range: "4w", grain: "weekly" });

      expect(result.aggregates[0].period).toBe("Week 1");
      expect(result.aggregates[1].period).toBe("Week 2");
    });
  });
});
