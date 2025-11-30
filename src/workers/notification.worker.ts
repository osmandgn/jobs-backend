/**
 * Notification Worker
 * Processes push notifications
 */

import { Job } from 'bull';
import { notificationQueue, NotificationJobData } from '../queues';
import { sendToDevices, sendToUser } from '../services/pushNotification.service';
import logger from '../utils/logger';

/**
 * Process notification job
 */
async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { type, userId, title, body, data, deviceTokens } = job.data;

  logger.debug(`Processing notification job ${job.id}`, { userId, type });

  try {
    if (type === 'push') {
      if (deviceTokens && deviceTokens.length > 0) {
        // Send to specific devices
        await sendToDevices(deviceTokens, { title, body });
      } else {
        // Send to all user devices
        await sendToUser(userId, { title, body });
      }
    }

    logger.debug(`Notification job ${job.id} completed`, { userId });
  } catch (error) {
    logger.error(`Notification job ${job.id} failed`, {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Start the notification worker
 */
export function startNotificationWorker(concurrency: number = 5): void {
  const queue = notificationQueue();

  queue.process(concurrency, processNotificationJob);

  logger.info(`Notification worker started with concurrency ${concurrency}`);
}

export default { startNotificationWorker };
