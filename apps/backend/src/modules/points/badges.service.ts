import { v4 as uuidv4 } from "uuid";
import type { Knex } from "knex";

import {
  countCompletedSessions,
  countCompletedSessionsOnUtcDay,
  countFollowsByUser,
  countPersonalRecords,
  getBadgeCatalog,
  getCompletedSessionDatesInRange,
  getCompletedSessionTypeCodeCounts,
  getDistinctTypeCodesInWindow,
  getUserBadgeCodes,
  insertBadgeAward,
} from "./points.repository.js";
import type {
  BadgeCatalogEntry,
  BadgeEvaluationResult,
  SessionMetricsSnapshot,
} from "./points.types.js";
import type { SessionWithExercises } from "../sessions/sessions.types.js";
import { criteriaMet, type BadgeCriteriaContext } from "./badge-criteria.js";

const STREAK_LOOKBACK_DAYS = 30;
const DISTINCT_WINDOWS = [7, 28];

function truncateIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startHourUtc(session: SessionWithExercises): number | null {
  if (!session.started_at) {
    return null;
  }
  const started = new Date(session.started_at);
  if (Number.isNaN(started.getTime())) {
    return null;
  }
  return started.getUTCHours();
}

function windowStart(completedAt: Date, days: number): Date {
  const start = new Date(completedAt);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

async function awardMatching(
  catalog: Map<string, BadgeCatalogEntry>,
  owned: Set<string>,
  ctx: BadgeCriteriaContext,
  metadata: Record<string, unknown>,
  trx?: Knex.Transaction,
  predicate?: (entry: BadgeCatalogEntry) => boolean,
): Promise<BadgeEvaluationResult[]> {
  const awarded: BadgeEvaluationResult[] = [];
  for (const entry of catalog.values()) {
    if (owned.has(entry.code)) {
      continue;
    }
    if (predicate && !predicate(entry)) {
      continue;
    }
    if (!criteriaMet(entry.criteria, ctx)) {
      continue;
    }
    await insertBadgeAward(
      {
        id: uuidv4(),
        user_id: ctx.userId,
        badge_type: entry.code,
        metadata,
        awarded_at: ctx.completedAt,
      },
      trx,
    );
    owned.add(entry.code);
    awarded.push({ badgeCode: entry.code, metadata });
  }
  return awarded;
}

async function buildContext(
  userId: string,
  completedAt: Date,
  metrics: SessionMetricsSnapshot,
  visibility: string,
  startHour: number | null,
  trx?: Knex.Transaction,
): Promise<BadgeCriteriaContext> {
  const streakFrom = windowStart(completedAt, STREAK_LOOKBACK_DAYS);
  const [
    completedSessions,
    typeCodeSessionCounts,
    completedDates,
    personalRecordCount,
    followerCount,
  ] = await Promise.all([
    countCompletedSessions(userId, trx),
    getCompletedSessionTypeCodeCounts(userId, trx),
    getCompletedSessionDatesInRange(userId, streakFrom, completedAt, trx),
    countPersonalRecords(userId, trx),
    countFollowsByUser(userId, trx),
  ]);

  const distinctTypeCodesByWindow = new Map<number, Set<string>>();
  await Promise.all(
    DISTINCT_WINDOWS.map(async (days) => {
      const from = windowStart(completedAt, days);
      const codes = await getDistinctTypeCodesInWindow(userId, from, completedAt, trx);
      distinctTypeCodesByWindow.set(days, codes);
    }),
  );

  const sessionsInCalendarDay = await countCompletedSessionsOnUtcDay(
    userId,
    truncateIsoDate(completedAt),
    trx,
  );

  return {
    completedSessions,
    typeCodeSessionCounts,
    distinctTypeCodesByWindow,
    completedDates,
    completedAt,
    runDistanceMeters: metrics.runDistanceMeters,
    rideDistanceMeters: metrics.rideDistanceMeters,
    rowDistanceMeters: metrics.rowDistanceMeters,
    sessionsInCalendarDay,
    startHourUtc: startHour,
    visibility,
    personalRecordCount,
    followerCount,
    userId,
  };
}

interface SessionEvalParams {
  session: SessionWithExercises;
  metrics: SessionMetricsSnapshot;
  trx: Knex.Transaction;
}

export async function evaluateBadgesForSession({
  session,
  metrics,
  trx,
}: SessionEvalParams): Promise<BadgeEvaluationResult[]> {
  const completedAt = new Date(session.completed_at ?? new Date());
  const catalog = await getBadgeCatalog(trx);
  const owned = await getUserBadgeCodes(session.owner_id, trx);
  const ctx = await buildContext(
    session.owner_id,
    completedAt,
    metrics,
    session.visibility ?? "private",
    startHourUtc(session),
    trx,
  );

  return awardMatching(
    catalog,
    owned,
    ctx,
    {
      session_id: session.id,
      awarded_at: completedAt.toISOString(),
    },
    trx,
    (entry) => !("follower_count" in entry.criteria && Object.keys(entry.criteria).length === 1),
  );
}

export async function evaluateBadgesForFollow(
  userId: string,
  trx?: Knex.Transaction,
): Promise<BadgeEvaluationResult[]> {
  const completedAt = new Date();
  const catalog = await getBadgeCatalog(trx);
  const owned = await getUserBadgeCodes(userId, trx);
  const emptyMetrics: SessionMetricsSnapshot = {
    averageRpe: null,
    distanceMeters: 0,
    runDistanceMeters: 0,
    rideDistanceMeters: 0,
    rowDistanceMeters: 0,
  };
  const ctx = await buildContext(userId, completedAt, emptyMetrics, "private", null, trx);

  return awardMatching(
    catalog,
    owned,
    ctx,
    { awarded_at: completedAt.toISOString(), source: "follow" },
    trx,
    (entry) => typeof entry.criteria.follower_count === "number",
  );
}
