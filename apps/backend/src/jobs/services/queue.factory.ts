import { logger } from "../../config/logger.js";
import { queueService as inMemoryQueue } from "./queue.service.js";
import { getBullMQService, shutdownBullMQ } from "./bullmq.queue.service.js";
import type { QueueJob } from "./queue.service.js";

/**
 * Abstract queue interface that both implementations must satisfy
 */
export interface IQueueService {
  enqueue(job: QueueJob): void | Promise<void>;
  getQueueLength?(): number | Promise<number>;
  isProcessing?(): boolean;
}

/**
 * Queue factory that returns the appropriate queue service
 * based on environment configuration
 */
export function getQueueService(): IQueueService {
  const redisEnabled = process.env.REDIS_ENABLED === "true";

  if (redisEnabled) {
    logger.info("[queue] Using BullMQ (Redis-backed) queue service");
    const bullMQ = getBullMQService();

    if (!bullMQ) {
      logger.warn(
        "[queue] REDIS_ENABLED=true but BullMQ service not available, falling back to in-memory",
      );
      return inMemoryQueue;
    }

    return bullMQ;
  }

  logger.info("[queue] Using in-memory queue service");
  return inMemoryQueue;
}

/**
 * Shutdown the active queue service
 */
export async function shutdownQueue(): Promise<void> {
  const redisEnabled = process.env.REDIS_ENABLED === "true";

  if (redisEnabled) {
    await shutdownBullMQ();
  } else {
    // Shutdown in-memory queue service to clear timers
    inMemoryQueue.shutdown();
  }

  logger.info("[queue] Queue service shutdown complete");
}

/**
 * Default export - use the factory to get the configured queue service
 */
export const queueService = getQueueService();
