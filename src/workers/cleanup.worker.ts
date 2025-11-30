/**
 * Cleanup Worker
 * Processes various cleanup tasks
 */

import { Job } from 'bull';
import { cleanupQueue, CleanupJobData } from '../queues';
import {
  cleanupExpiredCodes,
  cleanupExpiredTokens,
  cleanupUnverifiedAccounts,
  cleanupOldNotifications,
  cleanupOldAdminLogs,
  cleanupInactiveDeviceTokens,
  processAccountDeletions,
  expireOldJobs,
} from '../jobs/cleanup.job';
import logger from '../utils/logger';

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job<CleanupJobData>): Promise<void> {
  const { type } = job.data;

  logger.debug(`Processing cleanup job ${job.id}`, { type });

  try {
    let result: number;

    switch (type) {
      case 'tokens':
        result = await cleanupExpiredTokens();
        break;
      case 'codes':
        result = await cleanupExpiredCodes();
        break;
      case 'notifications':
        result = await cleanupOldNotifications();
        break;
      case 'uploads':
        // Cleanup orphaned uploads (to be implemented)
        result = 0;
        break;
      case 'accounts':
        result = await cleanupUnverifiedAccounts();
        result += await processAccountDeletions();
        break;
      case 'logs':
        result = await cleanupOldAdminLogs();
        break;
      default:
        logger.warn(`Unknown cleanup type: ${type}`);
        result = 0;
    }

    logger.debug(`Cleanup job ${job.id} completed`, { type, result });
  } catch (error) {
    logger.error(`Cleanup job ${job.id} failed`, {
      type,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Start the cleanup worker
 */
export function startCleanupWorker(concurrency: number = 1): void {
  const queue = cleanupQueue();

  queue.process(concurrency, processCleanupJob);

  logger.info(`Cleanup worker started with concurrency ${concurrency}`);
}

export default { startCleanupWorker };
