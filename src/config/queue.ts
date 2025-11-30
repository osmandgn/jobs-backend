/**
 * Bull Queue Configuration
 * Redis-backed job queues for background processing
 */

import Bull, { Queue, QueueOptions } from 'bull';
import { config } from './index';
import logger from '../utils/logger';

// Parse Redis URL to get connection details
function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
  };
}

const redisConfig = parseRedisUrl(config.redis.url);

// Queue configuration options
const defaultOptions: QueueOptions = {
  redis: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
  },
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
  },
};

// Queue names
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  EMAILS: 'emails',
  IMAGES: 'images',
  CLEANUP: 'cleanup',
  EXPORTS: 'exports',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Queue instances
const queues: Map<QueueName, Queue> = new Map();

/**
 * Get or create a queue instance
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Bull(name, defaultOptions);

    // Add event listeners
    queue.on('error', (error) => {
      logger.error(`Queue ${name} error:`, { error });
    });

    queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} waiting in queue ${name}`);
    });

    queue.on('active', (job) => {
      logger.debug(`Job ${job.id} started in queue ${name}`, {
        data: job.data,
      });
    });

    queue.on('completed', (job, result) => {
      logger.debug(`Job ${job.id} completed in queue ${name}`, { result });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed in queue ${name}:`, {
        error: error.message,
        stack: error.stack,
        data: job?.data,
        attemptsMade: job?.attemptsMade,
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue ${name}`);
    });

    queues.set(name, queue);
  }

  return queues.get(name)!;
}

/**
 * Get all queue instances
 */
export function getAllQueues(): Queue[] {
  return Array.from(queues.values());
}

/**
 * Close all queue connections
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((queue) =>
    queue.close()
  );
  await Promise.all(closePromises);
  queues.clear();
  logger.info('All queues closed');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(name: QueueName): Promise<{
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  const queue = getQueue(name);
  const [waiting, active, completed, failed, delayed, paused] =
    await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

/**
 * Get all queues statistics
 */
export async function getAllQueuesStats(): Promise<
  Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }>
> {
  const queueNames = Object.values(QUEUE_NAMES);
  return Promise.all(queueNames.map((name) => getQueueStats(name)));
}

/**
 * Clean completed and failed jobs older than specified grace period
 */
export async function cleanOldJobs(
  name: QueueName,
  gracePeriodMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<void> {
  const queue = getQueue(name);
  await queue.clean(gracePeriodMs, 'completed');
  await queue.clean(gracePeriodMs, 'failed');
  logger.info(`Cleaned old jobs from queue ${name}`);
}

/**
 * Pause a queue
 */
export async function pauseQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.pause();
  logger.info(`Queue ${name} paused`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.resume();
  logger.info(`Queue ${name} resumed`);
}

export default {
  getQueue,
  getAllQueues,
  closeAllQueues,
  getQueueStats,
  getAllQueuesStats,
  cleanOldJobs,
  pauseQueue,
  resumeQueue,
  QUEUE_NAMES,
};
