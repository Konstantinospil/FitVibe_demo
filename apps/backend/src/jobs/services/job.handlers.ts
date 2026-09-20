import { runRetentionSweep } from "../../services/retention.service.js";
import { evaluateStreakBonus } from "../../modules/points/streaks.service.js";
import { evaluateSeasonalEvents } from "../../modules/points/seasonal-events.service.js";
import db from "../../db/index.js";

export const SHARED_JOB_TYPES = [
  "retention.sweep",
  "leaderboard.refresh",
  "points.streaks.evaluate",
  "points.seasonal_events.evaluate",
] as const;

export type SharedJobType = (typeof SHARED_JOB_TYPES)[number];

function requireSessionEvaluationPayload(payload: Record<string, unknown>): {
  userId: string;
  sessionId: string;
  completedAt: string;
} {
  const { userId, sessionId, completedAt } = payload;
  if (
    typeof userId !== "string" ||
    typeof sessionId !== "string" ||
    typeof completedAt !== "string"
  ) {
    throw new Error("Invalid session evaluation job payload");
  }
  return { userId, sessionId, completedAt };
}

export async function executeSharedJob(
  name: SharedJobType,
  payload: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "retention.sweep":
      return runRetentionSweep();
    case "leaderboard.refresh":
      await db.raw("SELECT public.refresh_session_summary(TRUE);");
      await db.raw("REFRESH MATERIALIZED VIEW mv_leaderboard;");
      return { success: true };
    case "points.streaks.evaluate": {
      const { userId, sessionId, completedAt } = requireSessionEvaluationPayload(payload);
      return evaluateStreakBonus(userId, sessionId, completedAt);
    }
    case "points.seasonal_events.evaluate": {
      const { userId, sessionId, completedAt } = requireSessionEvaluationPayload(payload);
      return evaluateSeasonalEvents(userId, sessionId, completedAt);
    }
  }
}
