/**
 * Queue Definitions and Job Types
 */

import { getQueue, QUEUE_NAMES } from '../config/queue';
import logger from '../utils/logger';

// Job data types
export interface NotificationJobData {
  type: 'push' | 'in_app';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  deviceTokens?: string[];
}

export interface EmailJobData {
  to: string;
  template: string;
  subject: string;
  data: Record<string, unknown>;
}

export interface ImageJobData {
  type: 'profile' | 'portfolio' | 'job';
  userId: string;
  sourceKey: string;
  targetKey: string;
  width?: number;
  height?: number;
}

export interface CleanupJobData {
  type: 'tokens' | 'codes' | 'notifications' | 'uploads' | 'accounts' | 'logs';
}

export interface ExportJobData {
  userId: string;
  requestId: string;
}

// Queue accessors
export const notificationQueue = () => getQueue(QUEUE_NAMES.NOTIFICATIONS);
export const emailQueue = () => getQueue(QUEUE_NAMES.EMAILS);
export const imageQueue = () => getQueue(QUEUE_NAMES.IMAGES);
export const cleanupQueue = () => getQueue(QUEUE_NAMES.CLEANUP);
export const exportQueue = () => getQueue(QUEUE_NAMES.EXPORTS);

// Add job helpers
export async function addNotificationJob(
  data: NotificationJobData,
  options?: { priority?: number; delay?: number }
): Promise<void> {
  const queue = notificationQueue();
  await queue.add(data, {
    priority: options?.priority ?? 1, // High priority
    delay: options?.delay,
  });
  logger.debug('Notification job added', { userId: data.userId });
}

export async function addEmailJob(
  data: EmailJobData,
  options?: { priority?: number; delay?: number }
): Promise<void> {
  const queue = emailQueue();
  await queue.add(data, {
    priority: options?.priority ?? 2, // Normal priority
    delay: options?.delay,
  });
  logger.debug('Email job added', { to: data.to, template: data.template });
}

export async function addImageJob(
  data: ImageJobData,
  options?: { priority?: number }
): Promise<void> {
  const queue = imageQueue();
  await queue.add(data, {
    priority: options?.priority ?? 2,
  });
  logger.debug('Image job added', { type: data.type, sourceKey: data.sourceKey });
}

export async function addCleanupJob(
  data: CleanupJobData,
  options?: { delay?: number }
): Promise<void> {
  const queue = cleanupQueue();
  await queue.add(data, {
    priority: 3, // Low priority
    delay: options?.delay,
  });
  logger.debug('Cleanup job added', { type: data.type });
}

export async function addExportJob(
  data: ExportJobData,
  options?: { delay?: number }
): Promise<void> {
  const queue = exportQueue();
  await queue.add(data, {
    priority: 3, // Low priority
    delay: options?.delay,
  });
  logger.debug('Export job added', { userId: data.userId });
}

export default {
  notificationQueue,
  emailQueue,
  imageQueue,
  cleanupQueue,
  exportQueue,
  addNotificationJob,
  addEmailJob,
  addImageJob,
  addCleanupJob,
  addExportJob,
};
