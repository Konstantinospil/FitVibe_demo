import { v4 as uuidv4 } from "uuid";

import type { Knex } from "knex";
import { db } from "../../db/connection.js";
import { logger } from "../../config/logger.js";
import { HttpError } from "../../utils/http.js";
import { incrementPointsAwarded } from "../../observability/metrics.js";
import { pointsJobsService } from "../../jobs/services/points-jobs.service.js";
import {
  findPointsEventBySource,
  getExercisesMetadata,
  getPointsBalance,
  getPointsHistory as fetchPointsHistory,
  getRecentPointsEvents,
  insertPointsEvent,
  type HistoryCursor,
  type PointsHistoryOptions,
} from "./points.repository.js";
import type {
  AwardPointsResult,
  PointsEventRecord,
  PointsHistoryQuery,
  PointsHistoryResult,
  PointsSummary,
  SessionMetricsSnapshot,
} from "./points.types.js";
import type { SessionWithExercises } from "../sessions/sessions.types.js";
import { updateSession } from "../sessions/sessions.repository.js";
import { evaluateBadgesForSession } from "./badges.service.js";
import { detectSessionDomains, updateDomainVibeLevelForSession } from "./vibe-level.service.js";

const ALGORITHM_VERSION = "v2_vibe_lvl";
const DEFAULT_RECENT_LIMIT = 10;
const MAX_HISTORY_LIMIT = 100;

function decodeCursor(cursor: string): HistoryCursor {
  const [timestamp, id] = cursor.split("|");
  const date = new Date(timestamp);
  if (!id || Number.isNaN(date.getTime())) {
    throw new HttpError(400, "E.POINTS.INVALID_CURSOR", "POINTS_INVALID_CURSOR");
  }
  return { awardedAt: date, id };
}

function encodeCursor(event: PointsEventRecord): string {
  return `${event.awarded_at}|${event.id}`;
}

// Legacy helper functions - kept for reference but not currently used (only used by commented-out calculatePoints)
/*
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateAgeYears(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) {
    return null;
  }
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

function getFitnessAdjustment(level?: string | null): number {
  switch (level) {
    case "beginner":
      return 12;
    case "rehab":
      return 15;
    case "advanced":
      return 4;
    case "intermediate":
      return 8;
    default:
      return 10;
  }
}

function getAgeBonus(ageYears: number | null): number {
  if (ageYears === null) {
    return 6;
  }
  if (ageYears >= 55) {
    return 15;
  }
  if (ageYears >= 45) {
    return 12;
  }
  if (ageYears >= 30) {
    return 8;
  }
  return 5;
}

function parseFrequency(frequency?: string | null): number | null {
  if (!frequency) {
    return null;
  }
  const match = frequency.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isNaN(value) ? null : value;
}

function getFrequencyMultiplier(frequency?: string | null): number {
  const sessionsPerWeek = parseFrequency(frequency);
  if (!sessionsPerWeek || sessionsPerWeek <= 0) {
    return 1.05;
  }
  if (sessionsPerWeek <= 2) {
    return 1.12;
  }
  if (sessionsPerWeek <= 4) {
    return 1.0;
  }
  return 0.94;
}

function estimateCalories(distanceMeters: number, averageRpe: number | null): number | null {
  if (!distanceMeters) {
    return averageRpe ? averageRpe * 18 : null;
  }
  const distanceKm = distanceMeters / 1000;
  const base = distanceKm * 60;
  if (!averageRpe) {
    return base;
  }
  const modifier = 0.75 + averageRpe / 10;
  return base * modifier;
}

function calculatePoints(context: PointsCalculationContext): PointsCalculationResult {
  const caloriesRaw =
    context.sessionCalories ?? estimateCalories(context.distanceMeters, context.averageRpe);
  const calories = caloriesRaw === null ? null : clamp(caloriesRaw, 0, 1800);
  const averageRpe = context.averageRpe ?? 5;
  const boundedRpe = clamp(averageRpe, 3, 10);
  const distanceKm = context.distanceMeters / 1000;
  const ageYears = calculateAgeYears(context.profile.dateOfBirth);

  const base = 42;
  const caloriesComponent = calories ? calories * 0.05 : 0;
  const rpeComponent = (boundedRpe - 3) * 5;
  const distanceComponent = Math.min(distanceKm * 4, 60);
  const fitnessAdjustment = getFitnessAdjustment(context.profile.fitnessLevelCode ?? null);
  const ageBonus = getAgeBonus(ageYears);
  const frequencyMultiplier = getFrequencyMultiplier(context.profile.trainingFrequency ?? null);

  let total =
    base + caloriesComponent + rpeComponent + distanceComponent + fitnessAdjustment + ageBonus;
  total *= frequencyMultiplier;

  const rounded = Math.round(total);
  const points = clamp(rounded, 10, 400);

  return {
    points,
    inputs: {
      calories,
      averageRpe: context.averageRpe,
      distanceMeters: context.distanceMeters,
      ageYears,
      fitnessLevelCode: context.profile.fitnessLevelCode ?? null,
      trainingFrequency: context.profile.trainingFrequency ?? null,
    },
  };
}
*/

function computeSessionMetrics(
  session: SessionWithExercises,
  exerciseMetadata: Map<string, { tags: string[]; type_code: string | null }>,
): SessionMetricsSnapshot {
  const rpeValues: number[] = [];
  let totalDistanceMeters = 0;
  let runDistanceMeters = 0;
  let rideDistanceMeters = 0;

  for (const exercise of session.exercises ?? []) {
    if (exercise.actual?.rpe !== undefined && exercise.actual?.rpe !== null) {
      rpeValues.push(Number(exercise.actual.rpe));
    }
    const metadata = exercise.exercise_id ? exerciseMetadata.get(exercise.exercise_id) : undefined;
    const tags = metadata?.tags ?? [];
    const isRun = tags.some((tag) => tag.toLowerCase().includes("run"));
    const isRide =
      tags.some(
        (tag) => tag.toLowerCase().includes("ride") || tag.toLowerCase().includes("cycle"),
      ) || (metadata?.type_code ?? "").toLowerCase() === "cycling";

    if (exercise.actual?.distance !== undefined && exercise.actual.distance !== null) {
      const meters = Number(exercise.actual.distance) * 1000;
      totalDistanceMeters += meters;
      if (isRun) {
        runDistanceMeters += meters;
      }
      if (isRide) {
        rideDistanceMeters += meters;
      }
    }

    for (const set of exercise.sets ?? []) {
      if (set.rpe !== undefined && set.rpe !== null) {
        rpeValues.push(Number(set.rpe));
      }
      if (set.distance_m !== undefined && set.distance_m !== null) {
        const meters = Number(set.distance_m);
        totalDistanceMeters += meters;
        if (isRun) {
          runDistanceMeters += meters;
        }
        if (isRide) {
          rideDistanceMeters += meters;
        }
      }
    }
  }

  let averageRpe: number | null = null;
  if (rpeValues.length > 0) {
    averageRpe = rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length;
  }

  return {
    averageRpe,
    distanceMeters: totalDistanceMeters,
    runDistanceMeters,
    rideDistanceMeters,
  };
}

export async function getPointsSummary(userId: string): Promise<PointsSummary> {
  const [balance, recent] = await Promise.all([
    getPointsBalance(userId),
    getRecentPointsEvents(userId, DEFAULT_RECENT_LIMIT),
  ]);

  return {
    balance,
    recent,
  };
}

export async function getPointsHistory(
  userId: string,
  query: PointsHistoryQuery,
): Promise<PointsHistoryResult> {
  const limitInput = query.limit ?? 25;
  if (!Number.isInteger(limitInput) || limitInput < 1) {
    throw new HttpError(400, "E.POINTS.INVALID_LIMIT", "POINTS_INVALID_LIMIT");
  }
  const limit = Math.min(limitInput, MAX_HISTORY_LIMIT);

  const options: PointsHistoryOptions = {
    limit: limit + 1,
  };

  if (query.cursor) {
    options.cursor = decodeCursor(query.cursor);
  }

  if (query.from) {
    const fromDate = new Date(query.from);
    if (Number.isNaN(fromDate.getTime())) {
      throw new HttpError(400, "E.POINTS.INVALID_FROM", "POINTS_INVALID_FROM");
    }
    options.from = fromDate;
  }
  if (query.to) {
    const toDate = new Date(query.to);
    if (Number.isNaN(toDate.getTime())) {
      throw new HttpError(400, "E.POINTS.INVALID_TO", "POINTS_INVALID_TO");
    }
    options.to = toDate;
  }

  const rows = await fetchPointsHistory(userId, options);
  const items = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? encodeCursor(rows[limit]) : null;

  return {
    items,
    nextCursor,
  };
}

function ensureCompleted(session: SessionWithExercises) {
  if (session.status !== "completed") {
    throw new HttpError(400, "E.POINTS.SESSION_NOT_COMPLETED", "POINTS_SESSION_NOT_COMPLETED");
  }
  if (!session.completed_at) {
    throw new HttpError(
      400,
      "E.POINTS.MISSING_COMPLETED_AT",
      "Completed session is missing completed_at timestamp.",
    );
  }
}

export async function awardPointsForSession(
  session: SessionWithExercises,
): Promise<AwardPointsResult> {
  ensureCompleted(session);

  const awarded = await db.transaction(async (trx: Knex.Transaction) => {
    const existing = await findPointsEventBySource(
      session.owner_id,
      "session_completed",
      session.id,
      trx,
    );
    if (existing) {
      if (!session.points || session.points !== existing.points) {
        await updateSession(session.id, session.owner_id, { points: existing.points }, trx);
      }
      return {
        awarded: false,
        pointsAwarded: existing.points,
        eventId: existing.id,
        badgesAwarded: [],
      };
    }

    // Get exercise metadata
    const exerciseMetadata = await getExercisesMetadata(
      session.exercises
        ?.map((exercise) => exercise.exercise_id)
        .filter((id): id is string => Boolean(id)) ?? [],
      trx,
    );

    // Detect domains trained in this session
    const domainImpacts = detectSessionDomains(session, exerciseMetadata);

    // Get current vibe levels for all domains (currently not used but may be needed for future features)
    // const domainVibeLevels = await getAllDomainVibeLevels(session.owner_id, trx);

    // Update vibe levels and calculate points for each domain
    let totalPoints = 0;
    const vibeLevelUpdates: Array<{
      domain: string;
      oldLevel: number;
      newLevel: number;
      points: number;
    }> = [];

    for (const domainImpact of domainImpacts) {
      const updateResult = await updateDomainVibeLevelForSession(
        session.owner_id,
        domainImpact.domain,
        session,
        domainImpact,
        exerciseMetadata,
        trx,
      );

      totalPoints += updateResult.pointsAwarded;
      vibeLevelUpdates.push({
        domain: domainImpact.domain,
        oldLevel: updateResult.oldVibeLevel,
        newLevel: updateResult.newVibeLevel,
        points: updateResult.pointsAwarded,
      });
    }

    // Clamp total points to reasonable bounds
    totalPoints = Math.min(Math.max(totalPoints, 5), 500);

    // Calculate metrics for badges
    const metrics = computeSessionMetrics(session, exerciseMetadata);

    const awardedAt = new Date(session.completed_at!);
    const createdAt = new Date();

    // Store points event
    const event = await insertPointsEvent(
      {
        id: uuidv4(),
        user_id: session.owner_id,
        source_type: "session_completed",
        source_id: session.id,
        algorithm_version: ALGORITHM_VERSION,
        points: totalPoints,
        calories: session.calories ?? null,
        metadata: {
          session_id: session.id,
          session_title: session.title ?? null,
          algorithm: ALGORITHM_VERSION,
          domain_impacts: domainImpacts.map((di) => ({
            domain: di.domain,
            impact: di.impact,
            reason: di.reason,
          })),
          vibe_level_updates: vibeLevelUpdates,
          activity_breakdown: {
            distance_m: metrics.distanceMeters,
            run_distance_m: metrics.runDistanceMeters,
            ride_distance_m: metrics.rideDistanceMeters,
          },
        },
        awarded_at: awardedAt,
        created_at: createdAt,
      },
      trx,
    );

    await updateSession(session.id, session.owner_id, { points: totalPoints }, trx);

    const badgeResults = await evaluateBadgesForSession({
      session,
      metrics,
      trx,
    });

    if (badgeResults.length > 0) {
      for (const badge of badgeResults) {
        logger.info(
          {
            userId: session.owner_id,
            sessionId: session.id,
            badgeCode: badge.badgeCode,
          },
          "[points] Awarded badge",
        );
      }
    }

    incrementPointsAwarded("session_completed", totalPoints);
    logger.info(
      {
        userId: session.owner_id,
        sessionId: session.id,
        points: totalPoints,
        domains: domainImpacts.map((di) => di.domain),
      },
      "[points] Awarded points for session completion (v2_vibe_lvl)",
    );

    const completedIso = awardedAt.toISOString();
    pointsJobsService.scheduleStreakEvaluation(session.owner_id, session.id, completedIso);
    pointsJobsService.scheduleSeasonalEventSweep(session.owner_id, session.id, completedIso);

    return {
      awarded: true,
      pointsAwarded: totalPoints,
      eventId: event.id,
      badgesAwarded: badgeResults.map((badge) => badge.badgeCode),
    };
  });

  return awarded;
}
