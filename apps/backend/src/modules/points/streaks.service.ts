import { v4 as uuidv4 } from "uuid";
import type { Knex } from "knex";
import { db } from "../../db/connection.js";
import { logger } from "../../config/logger.js";
import { getCompletedSessionDatesInRange, insertPointsEvent } from "./points.repository.js";

/**
 * Calculate the current workout streak for a user
 * A streak is maintained by completing at least one session per day
 *
 * @param userId - The user ID
 * @param completedAt - The date to calculate streak from (usually current session completion)
 * @param trx - Optional transaction
 * @returns Current streak length in days
 */
export async function calculateCurrentStreak(
  userId: string,
  completedAt: Date,
  trx?: Knex.Transaction,
): Promise<number> {
  // Get all completed session dates in the past 90 days (maximum reasonable streak)
  const lookbackStart = new Date(completedAt);
  lookbackStart.setDate(lookbackStart.getDate() - 90);

  const completedDates = await getCompletedSessionDatesInRange(
    userId,
    lookbackStart,
    completedAt,
    trx,
  );

  if (completedDates.size === 0) {
    return 0;
  }

  // Start from completion date and count backwards
  let streakLength = 0;
  const cursor = new Date(completedAt);
  cursor.setUTCHours(0, 0, 0, 0); // Normalize to start of day

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (completedDates.has(dateStr)) {
      streakLength++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Streak broken
      break;
    }

    // Safety check: don't go back more than 90 days
    if (streakLength >= 90) {
      break;
    }
  }

  return streakLength;
}

/**
 * Award streak bonus points based on current streak length
 * Bonus points are awarded for maintaining consecutive workout days:
 * - 3-6 days: 5 bonus points
 * - 7-13 days: 10 bonus points
 * - 14-29 days: 20 bonus points
 * - 30+ days: 50 bonus points
 *
 * @param userId - The user ID
 * @param sessionId - The session that maintained/extended the streak
 * @param streakLength - Current streak length in days
 * @param completedAt - When the session was completed
 * @param trx - Optional transaction
 */
export async function awardStreakBonus(
  userId: string,
  sessionId: string,
  streakLength: number,
  completedAt: Date,
  trx?: Knex.Transaction,
): Promise<number> {
  let bonusPoints = 0;

  // Determine bonus points based on streak length
  if (streakLength >= 30) {
    bonusPoints = 50;
  } else if (streakLength >= 14) {
    bonusPoints = 20;
  } else if (streakLength >= 7) {
    bonusPoints = 10;
  } else if (streakLength >= 3) {
    bonusPoints = 5;
  }

  // No bonus for streaks less than 3 days
  if (bonusPoints === 0) {
    return 0;
  }

  // Record the streak bonus points
  const now = new Date();
  await insertPointsEvent(
    {
      id: uuidv4(),
      user_id: userId,
      source_type: "streak_bonus",
      source_id: sessionId,
      points: bonusPoints,
      calories: null,
      algorithm_version: "v1",
      metadata: {
        streak_days: streakLength,
        bonus_tier: bonusPoints,
      },
      awarded_at: completedAt,
      created_at: now,
    },
    trx,
  );

  logger.info(
    { userId, sessionId, streakLength, bonusPoints },
    "[streaks] Awarded streak bonus points",
  );

  return bonusPoints;
}

/**
 * Evaluate streaks and award bonus points for a completed session
 * This is called asynchronously after session completion via queue job
 *
 * @param userId - The user ID
 * @param sessionId - The completed session ID
 * @param completedAt - When the session was completed
 */
export async function evaluateStreakBonus(
  userId: string,
  sessionId: string,
  completedAt: string | Date,
): Promise<{ streakLength: number; bonusPoints: number }> {
  const completedDate = typeof completedAt === "string" ? new Date(completedAt) : completedAt;

  return db.transaction(async (trx) => {
    // Calculate current streak
    const streakLength = await calculateCurrentStreak(userId, completedDate, trx);

    logger.debug({ userId, sessionId, streakLength }, "[streaks] Calculated current streak length");

    // Award bonus points if applicable
    const bonusPoints = await awardStreakBonus(userId, sessionId, streakLength, completedDate, trx);

    return { streakLength, bonusPoints };
  });
}
