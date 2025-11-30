/**
 * Workers Index
 * Start all background workers
 */

import { startNotificationWorker } from './notification.worker';
import { startEmailWorker } from './email.worker';
import { startCleanupWorker } from './cleanup.worker';
import { startExportWorker } from './export.worker';
import logger from '../utils/logger';

interface WorkerConfig {
  notifications: number;
  emails: number;
  cleanup: number;
  exports: number;
}

const defaultConfig: WorkerConfig = {
  notifications: 5,
  emails: 3,
  cleanup: 1,
  exports: 1,
};

/**
 * Start all workers
 */
export function startAllWorkers(config: Partial<WorkerConfig> = {}): void {
  const finalConfig = { ...defaultConfig, ...config };

  logger.info('Starting all workers', { config: finalConfig });

  startNotificationWorker(finalConfig.notifications);
  startEmailWorker(finalConfig.emails);
  startCleanupWorker(finalConfig.cleanup);
  startExportWorker(finalConfig.exports);

  logger.info('All workers started');
}

export { startNotificationWorker } from './notification.worker';
export { startEmailWorker } from './email.worker';
export { startCleanupWorker } from './cleanup.worker';
export { startExportWorker } from './export.worker';

export default { startAllWorkers };
