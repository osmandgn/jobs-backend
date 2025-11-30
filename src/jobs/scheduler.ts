/**
 * Job Scheduler
 * Cron-based scheduled tasks
 */

import * as cron from 'node-cron';
import logger from '../utils/logger';
import { addCleanupJob } from '../queues';
import {
  runDailyCleanup,
  runWeeklyCleanup,
  runMonthlyCleanup,
  expireOldJobs,
} from './cleanup.job';
import { sendJobReminders } from './jobReminder.job';
import { sendDailyDigest, sendWeeklyDigest } from './notificationDigest.job';

interface ScheduledTask {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled: boolean;
}

// UK timezone (Europe/London handles BST/GMT automatically)
const TIMEZONE = 'Europe/London';

const scheduledTasks: ScheduledTask[] = [
  // Hourly tasks
  {
    name: 'expire-old-jobs',
    schedule: '0 * * * *', // Every hour at :00
    handler: async () => {
      await expireOldJobs();
    },
    enabled: true,
  },
  {
    name: 'job-reminders',
    schedule: '30 * * * *', // Every hour at :30
    handler: async () => {
      await sendJobReminders();
    },
    enabled: true,
  },
  {
    name: 'cleanup-expired-codes',
    schedule: '15 * * * *', // Every hour at :15
    handler: async () => {
      await addCleanupJob({ type: 'codes' });
    },
    enabled: true,
  },

  // Daily tasks
  {
    name: 'daily-cleanup',
    schedule: '0 3 * * *', // 3:00 AM UK time
    handler: async () => {
      await runDailyCleanup();
    },
    enabled: true,
  },
  {
    name: 'daily-digest',
    schedule: '0 9 * * *', // 9:00 AM UK time
    handler: async () => {
      await sendDailyDigest();
    },
    enabled: true,
  },

  // Weekly tasks
  {
    name: 'weekly-cleanup',
    schedule: '0 4 * * 0', // Sunday 4:00 AM UK time
    handler: async () => {
      await runWeeklyCleanup();
    },
    enabled: true,
  },
  {
    name: 'weekly-digest',
    schedule: '0 9 * * 1', // Monday 9:00 AM UK time
    handler: async () => {
      await sendWeeklyDigest();
    },
    enabled: true,
  },

  // Monthly tasks
  {
    name: 'monthly-cleanup',
    schedule: '0 5 1 * *', // 1st of month 5:00 AM UK time
    handler: async () => {
      await runMonthlyCleanup();
    },
    enabled: true,
  },
];

type ScheduledCronTask = ReturnType<typeof cron.schedule>;
const runningTasks: Map<string, ScheduledCronTask> = new Map();

/**
 * Start all scheduled tasks
 */
export function startScheduler(): void {
  logger.info('Starting job scheduler');

  for (const task of scheduledTasks) {
    if (!task.enabled) {
      logger.debug(`Skipping disabled task: ${task.name}`);
      continue;
    }

    if (!cron.validate(task.schedule)) {
      logger.error(`Invalid cron expression for task ${task.name}: ${task.schedule}`);
      continue;
    }

    const cronTask = cron.schedule(
      task.schedule,
      async () => {
        const startTime = Date.now();
        logger.info(`Starting scheduled task: ${task.name}`);

        try {
          await task.handler();
          const duration = Date.now() - startTime;
          logger.info(`Scheduled task completed: ${task.name}`, { duration: `${duration}ms` });
        } catch (error) {
          logger.error(`Scheduled task failed: ${task.name}`, {
            error: error instanceof Error ? error.message : error,
          });
        }
      },
      {
        timezone: TIMEZONE,
      }
    );

    runningTasks.set(task.name, cronTask);
    logger.debug(`Scheduled task registered: ${task.name} (${task.schedule})`);
  }

  logger.info(`Job scheduler started with ${runningTasks.size} tasks`);
}

/**
 * Stop all scheduled tasks
 */
export function stopScheduler(): void {
  logger.info('Stopping job scheduler');

  for (const [name, task] of runningTasks) {
    task.stop();
    logger.debug(`Stopped task: ${name}`);
  }

  runningTasks.clear();
  logger.info('Job scheduler stopped');
}

/**
 * Get status of all scheduled tasks
 */
export function getSchedulerStatus(): Array<{
  name: string;
  schedule: string;
  enabled: boolean;
  running: boolean;
}> {
  return scheduledTasks.map((task) => ({
    name: task.name,
    schedule: task.schedule,
    enabled: task.enabled,
    running: runningTasks.has(task.name),
  }));
}

/**
 * Manually trigger a scheduled task
 */
export async function triggerTask(name: string): Promise<void> {
  const task = scheduledTasks.find((t) => t.name === name);
  if (!task) {
    throw new Error(`Task not found: ${name}`);
  }

  logger.info(`Manually triggering task: ${name}`);
  await task.handler();
}

export default {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerTask,
};
