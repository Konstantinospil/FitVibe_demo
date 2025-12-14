import type { Knex } from "knex";

import { db } from "../../db/connection.js";
import { logger } from "../../config/logger.js";
import {
  updateDomainVibeLevel,
  insertVibeLevelChange,
} from "../../modules/points/points.repository.js";
import type { DomainCode } from "../../modules/points/points.types.js";

/**
 * Apply rating decay to domains that haven't been updated in 1+ days
 * Decay formula:
 * - Vibe level loss: 1 point per day (max 50)
 * - RD increase: 2 points per day (max 50)
 * - Volatility increase: slight increase (uncertainty grows)
 */
export async function applyVibeLevelDecay(): Promise<void> {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  logger.info("[vibe-level-decay] Starting decay process");

  // Find all domains that haven't been updated in 1+ days
  interface StaleRatingRow {
    user_id: string;
    domain_code: string;
    vibe_level: number;
    rating_deviation: number;
    volatility: number;
    last_updated_at: Date | string;
  }

  const staleRatings = await db<StaleRatingRow>("user_domain_vibe_levels")
    .where("last_updated_at", "<", oneDayAgo.toISOString())
    .select<
      StaleRatingRow[]
    >(["user_id", "domain_code", "vibe_level", "rating_deviation", "volatility", "last_updated_at"]);

  logger.info({ count: staleRatings.length }, "[vibe-level-decay] Found domains requiring decay");

  let processedCount = 0;
  let decayedCount = 0;

  for (const rating of staleRatings) {
    const lastUpdated = new Date(rating.last_updated_at);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate >= 1) {
      const decayDays = Math.floor(daysSinceUpdate);

      // Vibe level loss: 1 point per day (max 50)
      const vibeLevelLoss = Math.min(50, decayDays * 1.0);

      // RD increase: 2 points per day (max 50)
      const rdIncrease = Math.min(50, decayDays * 2.0);

      // Volatility increase: slight increase (uncertainty grows)
      const volatilityIncrease = rating.volatility * 0.01;

      const newVibeLevel = Math.max(100, rating.vibe_level - vibeLevelLoss);
      const newRd = Math.min(350, rating.rating_deviation + rdIncrease);
      const newVolatility = Math.min(0.1, rating.volatility + volatilityIncrease);

      try {
        await db.transaction(async (trx: Knex.Transaction) => {
          await updateDomainVibeLevel(
            rating.user_id,
            rating.domain_code as DomainCode,
            newVibeLevel,
            newRd,
            newVolatility,
            trx,
          );

          await insertVibeLevelChange(
            {
              user_id: rating.user_id,
              domain_code: rating.domain_code as DomainCode,
              session_id: null,
              old_vibe_level: rating.vibe_level,
              new_vibe_level: newVibeLevel,
              old_rd: rating.rating_deviation,
              new_rd: newRd,
              change_amount: newVibeLevel - rating.vibe_level,
              performance_score: null,
              domain_impact: null,
              points_awarded: null,
              change_reason: "decay",
              metadata: {
                days_since_update: decayDays,
                decay_days: decayDays,
              },
            },
            trx,
          );
        });
      } catch (error) {
        logger.error(
          {
            userId: rating.user_id,
            domain: rating.domain_code,
            error: error instanceof Error ? error.message : String(error),
          },
          "[vibe-level-decay] Failed to apply decay",
        );
        // Continue processing other ratings even if one fails
      }

      decayedCount++;
      logger.debug(
        {
          userId: rating.user_id,
          domain: rating.domain_code,
          daysSinceUpdate: decayDays,
          oldVibeLevel: rating.vibe_level,
          newVibeLevel,
        },
        "[vibe-level-decay] Applied decay",
      );
    }

    processedCount++;
  }

  logger.info(
    { processed: processedCount, decayed: decayedCount },
    "[vibe-level-decay] Decay process completed",
  );
}
