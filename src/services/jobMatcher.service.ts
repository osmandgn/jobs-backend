import { prisma } from '../config/database';
import { Job, User } from '@prisma/client';
import logger from '../utils/logger';

interface MatchedUser {
  userId: string;
  email: string;
  firstName: string;
  distance: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find users who might be interested in a job based on:
 * - is_actively_looking = true
 * - subscribed to job's category
 * - within notification_radius_miles of job location
 * - status = active
 * - not blocked by employer
 */
export async function findMatchingUsers(
  job: Job,
  employerId: string
): Promise<MatchedUser[]> {
  // Get job category
  const jobCategoryId = job.categoryId;

  // Get all blocked user IDs by employer
  const blockedUsers = await prisma.blockedUser.findMany({
    where: { blockerId: employerId },
    select: { blockedId: true },
  });
  const blockedUserIds = blockedUsers.map((b) => b.blockedId);

  // Also get users who blocked the employer
  const blockedByUsers = await prisma.blockedUser.findMany({
    where: { blockedId: employerId },
    select: { blockerId: true },
  });
  const blockedByUserIds = blockedByUsers.map((b) => b.blockerId);

  // Combine all excluded user IDs
  const excludedUserIds = [...new Set([...blockedUserIds, ...blockedByUserIds, employerId])];

  // Find users who:
  // 1. Are actively looking
  // 2. Have active status
  // 3. Are subscribed to job's category
  // 4. Not in excluded list
  const potentialUsers = await prisma.user.findMany({
    where: {
      isActivelyLooking: true,
      status: 'active',
      id: { notIn: excludedUserIds },
      locationLat: { not: null },
      locationLng: { not: null },
      categories: {
        some: {
          categoryId: jobCategoryId,
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      locationLat: true,
      locationLng: true,
      notificationRadiusMiles: true,
    },
  });

  // Filter by distance
  const matchedUsers: MatchedUser[] = [];

  for (const user of potentialUsers) {
    if (user.locationLat && user.locationLng && job.locationLat && job.locationLng) {
      const distance = calculateDistance(
        user.locationLat,
        user.locationLng,
        job.locationLat,
        job.locationLng
      );

      if (distance <= user.notificationRadiusMiles) {
        matchedUsers.push({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        });
      }
    }
  }

  logger.info('Job matching completed', {
    jobId: job.id,
    potentialUsers: potentialUsers.length,
    matchedUsers: matchedUsers.length,
  });

  return matchedUsers;
}

/**
 * Find jobs that match a user's preferences
 * Used for job recommendations and digest emails
 */
export async function findMatchingJobs(userId: string, limit: number = 10): Promise<Job[]> {
  // Get user's preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      categories: { select: { categoryId: true } },
      blockedUsers: { select: { blockedId: true } },
      blockedBy: { select: { blockerId: true } },
    },
  });

  if (!user || !user.locationLat || !user.locationLng) {
    return [];
  }

  const subscribedCategoryIds = user.categories.map((c) => c.categoryId);

  // Get blocked user IDs (both directions)
  const blockedByMe = user.blockedUsers.map((b) => b.blockedId);
  const blockedMe = user.blockedBy.map((b) => b.blockerId);
  const excludedUserIds = [...new Set([...blockedByMe, ...blockedMe])];

  if (subscribedCategoryIds.length === 0) {
    return [];
  }

  // Find active jobs in subscribed categories
  const jobs = await prisma.job.findMany({
    where: {
      status: 'active',
      categoryId: { in: subscribedCategoryIds },
      userId: { notIn: excludedUserIds },
      jobDate: { gte: new Date() }, // Only future jobs
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 3, // Get more to filter by distance
  });

  // Filter by distance and limit
  const matchingJobs: Job[] = [];

  for (const job of jobs) {
    if (!job.locationLat || !job.locationLng) continue;

    const distance = calculateDistance(
      user.locationLat,
      user.locationLng,
      job.locationLat,
      job.locationLng
    );

    if (distance <= user.notificationRadiusMiles) {
      matchingJobs.push(job);
      if (matchingJobs.length >= limit) {
        break;
      }
    }
  }

  return matchingJobs;
}

/**
 * Get unread job matches for a user (for digest emails)
 */
export async function getUnreadJobMatches(
  userId: string,
  since: Date
): Promise<Job[]> {
  // Get jobs that were created since the given date and match user's preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      categories: { select: { categoryId: true } },
      blockedUsers: { select: { blockedId: true } },
      blockedBy: { select: { blockerId: true } },
    },
  });

  if (!user || !user.locationLat || !user.locationLng) {
    return [];
  }

  const subscribedCategoryIds = user.categories.map((c) => c.categoryId);
  const blockedByMe = user.blockedUsers.map((b) => b.blockedId);
  const blockedMe = user.blockedBy.map((b) => b.blockerId);
  const excludedUserIds = [...new Set([...blockedByMe, ...blockedMe])];

  if (subscribedCategoryIds.length === 0) {
    return [];
  }

  // Get jobs created since the given date
  const jobs = await prisma.job.findMany({
    where: {
      status: 'active',
      categoryId: { in: subscribedCategoryIds },
      userId: { notIn: excludedUserIds },
      createdAt: { gte: since },
      jobDate: { gte: new Date() },
    },
    include: {
      category: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by distance
  const matchingJobs = jobs.filter((job) => {
    if (!job.locationLat || !job.locationLng) return false;

    const distance = calculateDistance(
      user.locationLat!,
      user.locationLng!,
      job.locationLat,
      job.locationLng
    );
    return distance <= user.notificationRadiusMiles;
  });

  return matchingJobs;
}

/**
 * Count jobs matching user's preferences in last 24 hours
 */
export async function countRecentMatches(userId: string): Promise<number> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const matches = await getUnreadJobMatches(userId, since);
  return matches.length;
}

export default {
  findMatchingUsers,
  findMatchingJobs,
  getUnreadJobMatches,
  countRecentMatches,
  calculateDistance,
};
