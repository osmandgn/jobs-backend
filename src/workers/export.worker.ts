/**
 * Export Worker
 * Processes data export requests (GDPR)
 */

import { Job } from 'bull';
import { exportQueue, ExportJobData } from '../queues';
import { exportUserData } from '../services/gdpr.service';
import logger from '../utils/logger';

/**
 * Process export job
 */
async function processExportJob(job: Job<ExportJobData>): Promise<void> {
  const { userId, requestId } = job.data;

  logger.debug(`Processing export job ${job.id}`, { userId, requestId });

  try {
    // Export user data
    const exportData = await exportUserData(userId);

    // TODO: Upload to S3 and send email with download link
    // For now, just log the completion
    logger.info(`Export job ${job.id} completed`, {
      userId,
      requestId,
      dataSize: JSON.stringify(exportData).length,
    });
  } catch (error) {
    logger.error(`Export job ${job.id} failed`, {
      userId,
      requestId,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Start the export worker
 */
export function startExportWorker(concurrency: number = 1): void {
  const queue = exportQueue();

  queue.process(concurrency, processExportJob);

  logger.info(`Export worker started with concurrency ${concurrency}`);
}

export default { startExportWorker };
