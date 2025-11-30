/**
 * Notification Digest Job
 * Sends daily and weekly email digests of new jobs
 */

import { prisma } from '../config/database';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

interface JobDigestData {
  id: string;
  title: string;
  description: string;
  locationCity: string | null;
  payAmount: string;
  payType: string;
}

/**
 * Get new jobs for a user based on their preferences
 */
async function getMatchingJobsForUser(
  userId: string,
  since: Date
): Promise<Record<string, JobDigestData[]>> {
  // Get user preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      locationLat: true,
      locationLng: true,
      categories: {
        select: { category: { select: { name: true, id: true } } },
      },
    },
  });

  if (!user) return {};

  const categoryIds = user.categories.map((c) => c.category.id);

  // Find matching jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: 'active',
      createdAt: { gte: since },
      categoryId: categoryIds.length > 0 ? { in: categoryIds } : undefined,
    },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Max 50 jobs per digest
  });

  // Group by category
  const jobsByCategory: Record<string, JobDigestData[]> = {};

  for (const job of jobs) {
    const categoryName = job.category.name;
    if (!jobsByCategory[categoryName]) {
      jobsByCategory[categoryName] = [];
    }
    jobsByCategory[categoryName].push({
      id: job.id,
      title: job.title,
      description: job.description.substring(0, 150) + '...',
      locationCity: job.locationCity,
      payAmount: job.payAmount.toString(),
      payType: job.payType,
    });
  }

  return jobsByCategory;
}

/**
 * Send daily digest to users
 * Run: Daily at 9:00 AM UK time
 */
export async function sendDailyDigest(): Promise<number> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Find users with daily digest enabled
    const usersWithDailyDigest = await prisma.notificationPreference.findMany({
      where: {
        newJobEmail: true,
        newJobEmailFrequency: 'daily',
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true },
        },
      },
    });

    let emailsSent = 0;

    for (const pref of usersWithDailyDigest) {
      try {
        const jobsByCategory = await getMatchingJobsForUser(pref.userId, yesterday);

        const totalJobs = Object.values(jobsByCategory).flat().length;

        if (totalJobs === 0) continue; // Skip if no matching jobs

        await emailService.sendDailyDigestEmail(
          pref.user.email,
          pref.user.firstName,
          jobsByCategory
        );

        emailsSent++;
      } catch (error) {
        logger.error(`Failed to send daily digest to ${pref.userId}`, { error });
      }
    }

    logger.info(`Sent ${emailsSent} daily digest emails`);
    return emailsSent;
  } catch (error) {
    logger.error('Failed to send daily digests', { error });
    throw error;
  }
}

/**
 * Send weekly digest to users
 * Run: Monday at 9:00 AM UK time
 */
export async function sendWeeklyDigest(): Promise<number> {
  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Find users with weekly digest enabled
    const usersWithWeeklyDigest = await prisma.notificationPreference.findMany({
      where: {
        newJobEmail: true,
        newJobEmailFrequency: 'weekly',
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true },
        },
      },
    });

    let emailsSent = 0;

    for (const pref of usersWithWeeklyDigest) {
      try {
        const jobsByCategory = await getMatchingJobsForUser(pref.userId, lastWeek);

        const totalJobs = Object.values(jobsByCategory).flat().length;

        if (totalJobs === 0) continue; // Skip if no matching jobs

        await emailService.sendWeeklyDigestEmail(
          pref.user.email,
          pref.user.firstName,
          jobsByCategory
        );

        emailsSent++;
      } catch (error) {
        logger.error(`Failed to send weekly digest to ${pref.userId}`, { error });
      }
    }

    logger.info(`Sent ${emailsSent} weekly digest emails`);
    return emailsSent;
  } catch (error) {
    logger.error('Failed to send weekly digests', { error });
    throw error;
  }
}

export default {
  sendDailyDigest,
  sendWeeklyDigest,
};
