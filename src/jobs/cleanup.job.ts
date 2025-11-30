/**
 * Cleanup Jobs - Data retention and maintenance tasks
 * These jobs should be run periodically (e.g., via cron)
 */

import { prisma } from '../config/database';
import { cacheService } from '../services/cache.service';
import { getSetting } from '../services/settings.service';
import { processPendingDeletions, anonymizeInactiveAccounts } from '../services/gdpr.service';
import logger from '../utils/logger';

/**
 * Clean up expired verification codes
 * Run: Every hour
 */
export async function cleanupExpiredCodes(): Promise<number> {
  try {
    const result = await prisma.verificationCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired verification codes`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired verification codes', { error });
    throw error;
  }
}

/**
 * Clean up expired refresh tokens
 * Run: Every day
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7 days old revoked
        ],
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired/revoked refresh tokens`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', { error });
    throw error;
  }
}

/**
 * Clean up unverified accounts after X days
 * Run: Daily
 */
export async function cleanupUnverifiedAccounts(): Promise<number> {
  try {
    const unverifiedDays = await getSetting<number>('unverified_cleanup_days');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - unverifiedDays);

    // Find unverified accounts older than cutoff
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lt: cutoffDate },
        status: 'active',
      },
      select: { id: true, email: true },
    });

    let deleted = 0;

    for (const user of unverifiedUsers) {
      try {
        // Delete user and cascade relations
        await prisma.$transaction(async (tx) => {
          // Delete related data
          await tx.userSkill.deleteMany({ where: { userId: user.id } });
          await tx.userCategory.deleteMany({ where: { userId: user.id } });
          await tx.userExperience.deleteMany({ where: { userId: user.id } });
          await tx.userPortfolio.deleteMany({ where: { userId: user.id } });
          await tx.notification.deleteMany({ where: { userId: user.id } });
          await tx.deviceToken.deleteMany({ where: { userId: user.id } });
          await tx.refreshToken.deleteMany({ where: { userId: user.id } });
          await tx.verificationCode.deleteMany({ where: { userId: user.id } });

          // Delete the user
          await tx.user.delete({ where: { id: user.id } });
        });

        deleted++;
        logger.info(`Deleted unverified account: ${user.email}`);
      } catch (error) {
        logger.error(`Failed to delete unverified account: ${user.id}`, { error });
      }
    }

    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} unverified accounts`);
    }

    return deleted;
  } catch (error) {
    logger.error('Failed to cleanup unverified accounts', { error });
    throw error;
  }
}

/**
 * Expire old jobs
 * Run: Daily
 */
export async function expireOldJobs(): Promise<number> {
  try {
    const expiryDays = await getSetting<number>('job_expiry_days');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

    const result = await prisma.job.updateMany({
      where: {
        status: 'active',
        jobDate: { lt: cutoffDate },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      logger.info(`Expired ${result.count} old jobs`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to expire old jobs', { error });
    throw error;
  }
}

/**
 * Clean up old notifications
 * Run: Weekly
 */
export async function cleanupOldNotifications(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old notifications`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup old notifications', { error });
    throw error;
  }
}

/**
 * Clean up old admin logs
 * Run: Monthly
 */
export async function cleanupOldAdminLogs(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // Keep 2 years

    const result = await prisma.adminLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old admin logs`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup old admin logs', { error });
    throw error;
  }
}

/**
 * Clean up inactive device tokens
 * Run: Weekly
 */
export async function cleanupInactiveDeviceTokens(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days inactive

    const result = await prisma.deviceToken.deleteMany({
      where: {
        lastUsedAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} inactive device tokens`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup inactive device tokens', { error });
    throw error;
  }
}

/**
 * Process pending account deletions (GDPR)
 * Run: Daily
 */
export async function processAccountDeletions(): Promise<number> {
  try {
    const processed = await processPendingDeletions();

    if (processed > 0) {
      logger.info(`Processed ${processed} account deletions`);
    }

    return processed;
  } catch (error) {
    logger.error('Failed to process account deletions', { error });
    throw error;
  }
}

/**
 * Flag inactive accounts for data minimization (GDPR)
 * Run: Monthly
 */
export async function flagInactiveAccounts(): Promise<number> {
  try {
    const flagged = await anonymizeInactiveAccounts(365); // 1 year inactive

    if (flagged > 0) {
      logger.info(`Flagged ${flagged} inactive accounts`);
    }

    return flagged;
  } catch (error) {
    logger.error('Failed to flag inactive accounts', { error });
    throw error;
  }
}

/**
 * Run all daily cleanup jobs
 */
export async function runDailyCleanup(): Promise<void> {
  logger.info('Starting daily cleanup jobs');

  const results = {
    expiredCodes: await cleanupExpiredCodes(),
    expiredTokens: await cleanupExpiredTokens(),
    unverifiedAccounts: await cleanupUnverifiedAccounts(),
    expiredJobs: await expireOldJobs(),
    accountDeletions: await processAccountDeletions(),
  };

  logger.info('Daily cleanup completed', results);
}

/**
 * Run all weekly cleanup jobs
 */
export async function runWeeklyCleanup(): Promise<void> {
  logger.info('Starting weekly cleanup jobs');

  const results = {
    oldNotifications: await cleanupOldNotifications(),
    inactiveDeviceTokens: await cleanupInactiveDeviceTokens(),
  };

  logger.info('Weekly cleanup completed', results);
}

/**
 * Run all monthly cleanup jobs
 */
export async function runMonthlyCleanup(): Promise<void> {
  logger.info('Starting monthly cleanup jobs');

  const results = {
    oldAdminLogs: await cleanupOldAdminLogs(),
    inactiveAccounts: await flagInactiveAccounts(),
  };

  logger.info('Monthly cleanup completed', results);
}

export const cleanupJobs = {
  cleanupExpiredCodes,
  cleanupExpiredTokens,
  cleanupUnverifiedAccounts,
  expireOldJobs,
  cleanupOldNotifications,
  cleanupOldAdminLogs,
  cleanupInactiveDeviceTokens,
  processAccountDeletions,
  flagInactiveAccounts,
  runDailyCleanup,
  runWeeklyCleanup,
  runMonthlyCleanup,
};

export default cleanupJobs;
