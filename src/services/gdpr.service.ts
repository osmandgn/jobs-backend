import { prisma } from '../config/database';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import logger from '../utils/logger';
import { NotFoundError, ErrorCodes, ForbiddenError } from '../utils/AppError';
import { getSetting } from './settings.service';
import type { Prisma } from '@prisma/client';

interface ExportData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    bio: string | null;
    dateOfBirth: Date | null;
    postcode: string | null;
    latitude: number | null;
    longitude: number | null;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  profile: {
    profilePhoto: string | null;
    skills: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string }>;
    portfolio: Array<{
      id: string;
      imageUrl: string;
      caption: string | null;
      createdAt: Date;
    }>;
  };
  jobs: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    paymentType: string;
    paymentAmount: number;
    location: string;
    createdAt: Date;
  }>;
  applications: Array<{
    id: string;
    jobTitle: string;
    status: string;
    message: string | null;
    appliedAt: Date;
  }>;
  reviews: {
    given: Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
    }>;
    received: Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
    }>;
  };
  messages: Array<{
    id: string;
    conversationId: string;
    content: string;
    sentAt: Date;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    createdAt: Date;
  }>;
  exportedAt: string;
  exportVersion: string;
}

interface DeletionRequest {
  id: string;
  userId: string;
  reason: string | null;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date;
}

/**
 * Export all user data (GDPR data portability)
 */
export async function exportUserData(userId: string): Promise<ExportData> {
  // Get user with all related data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: {
        include: {
          skill: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
      portfolioItems: true,
      postedJobs: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          payType: true,
          payAmount: true,
          locationAddress: true,
          createdAt: true,
        },
      },
      applications: {
        include: {
          job: {
            select: {
              title: true,
            },
          },
        },
      },
      reviewsGiven: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      },
      reviewsReceived: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      },
      sentMessages: {
        select: {
          id: true,
          conversationId: true,
          content: true,
          createdAt: true,
        },
        take: 1000, // Limit messages
      },
      notifications: {
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          createdAt: true,
        },
        take: 500, // Limit notifications
      },
    },
  });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.USER_NOT_FOUND);
  }

  // Compile export data
  const exportData: ExportData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      bio: user.bio,
      dateOfBirth: null, // Not in schema
      postcode: user.locationPostcode,
      latitude: user.locationLat ? Number(user.locationLat) : null,
      longitude: user.locationLng ? Number(user.locationLng) : null,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    profile: {
      profilePhoto: user.profilePhotoUrl,
      skills: user.skills.map((us) => ({
        id: us.skill.id,
        name: us.skill.name,
      })),
      categories: user.categories.map((uc) => ({
        id: uc.category.id,
        name: uc.category.name,
      })),
      portfolio: user.portfolioItems.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        caption: p.description,
        createdAt: p.createdAt,
      })),
    },
    jobs: user.postedJobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      paymentType: job.payType,
      paymentAmount: Number(job.payAmount),
      location: job.locationAddress || '',
      createdAt: job.createdAt,
    })),
    applications: user.applications.map((app) => ({
      id: app.id,
      jobTitle: app.job.title,
      status: app.status,
      message: app.message,
      appliedAt: app.createdAt,
    })),
    reviews: {
      given: user.reviewsGiven.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      received: user.reviewsReceived.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    },
    messages: user.sentMessages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
      sentAt: msg.createdAt,
    })),
    notifications: user.notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
    })),
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
  };

  logger.info(`User data exported: ${userId}`);

  return exportData;
}

/**
 * Request account deletion (GDPR right to be forgotten)
 */
export async function requestAccountDeletion(
  userId: string,
  reason?: string
): Promise<DeletionRequest> {
  // Check if user exists and is not already pending deletion
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.USER_NOT_FOUND);
  }

  if (user.status === 'pending_deletion') {
    throw new ForbiddenError(
      'Hesap zaten silme sürecinde',
      ErrorCodes.FORBIDDEN
    );
  }

  // Get deletion delay from settings
  const delayDays = await getSetting<number>('account_deletion_delay_days');
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + delayDays);

  // Create deletion request
  const deletionRequest = await prisma.accountDeletionRequest.create({
    data: {
      userId,
      reason,
      scheduledFor,
      status: 'pending',
    },
  });

  // Update user status
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'pending_deletion' },
  });

  // Invalidate user cache
  await cacheService.del(cacheKeys.user.profile(userId));

  logger.info(`Account deletion requested: ${userId}`, {
    scheduledFor,
    reason,
  });

  return {
    id: deletionRequest.id,
    userId: deletionRequest.userId,
    reason: deletionRequest.reason,
    scheduledFor: deletionRequest.scheduledFor,
    status: deletionRequest.status as DeletionRequest['status'],
    createdAt: deletionRequest.createdAt,
  };
}

/**
 * Cancel account deletion request
 */
export async function cancelAccountDeletion(userId: string): Promise<void> {
  const request = await prisma.accountDeletionRequest.findFirst({
    where: {
      userId,
      status: 'pending',
    },
  });

  if (!request) {
    throw new NotFoundError(
      'Silme talebi bulunamadı',
      ErrorCodes.NOT_FOUND
    );
  }

  // Cancel the request
  await prisma.accountDeletionRequest.update({
    where: { id: request.id },
    data: { status: 'cancelled' },
  });

  // Restore user status
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active' },
  });

  // Invalidate user cache
  await cacheService.del(cacheKeys.user.profile(userId));

  logger.info(`Account deletion cancelled: ${userId}`);
}

/**
 * Get deletion request status
 */
export async function getDeletionStatus(
  userId: string
): Promise<DeletionRequest | null> {
  const request = await prisma.accountDeletionRequest.findFirst({
    where: {
      userId,
      status: { in: ['pending', 'processing'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!request) {
    return null;
  }

  return {
    id: request.id,
    userId: request.userId,
    reason: request.reason,
    scheduledFor: request.scheduledFor,
    status: request.status as DeletionRequest['status'],
    createdAt: request.createdAt,
  };
}

/**
 * Process pending deletions (called by cron job)
 */
export async function processPendingDeletions(): Promise<number> {
  const now = new Date();

  // Find all pending deletions that are due
  const pendingDeletions = await prisma.accountDeletionRequest.findMany({
    where: {
      status: 'pending',
      scheduledFor: { lte: now },
    },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  let processed = 0;

  for (const request of pendingDeletions) {
    try {
      // Mark as processing
      await prisma.accountDeletionRequest.update({
        where: { id: request.id },
        data: { status: 'processing' },
      });

      // Perform deletion
      await deleteUserData(request.userId);

      // Mark as completed
      await prisma.accountDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      processed++;
      logger.info(`Account deleted: ${request.userId}`);
    } catch (error) {
      logger.error(`Failed to delete account: ${request.userId}`, { error });
    }
  }

  return processed;
}

/**
 * Delete user data (GDPR right to erasure)
 */
export async function deleteUserData(userId: string): Promise<void> {
  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Delete user's messages
    await tx.message.deleteMany({
      where: { senderId: userId },
    });

    // Mark conversations as deleted for user
    await tx.conversation.updateMany({
      where: { employerId: userId },
      data: { isEmployerDeleted: true },
    });

    await tx.conversation.updateMany({
      where: { applicantId: userId },
      data: { isApplicantDeleted: true },
    });

    // Delete notifications
    await tx.notification.deleteMany({
      where: { userId },
    });

    // Delete device tokens
    await tx.deviceToken.deleteMany({
      where: { userId },
    });

    // Delete saved jobs
    await tx.savedJob.deleteMany({
      where: { userId },
    });

    // Delete portfolio items
    await tx.userPortfolio.deleteMany({
      where: { userId },
    });

    // Delete user experiences
    await tx.userExperience.deleteMany({
      where: { userId },
    });

    // Delete user skills
    await tx.userSkill.deleteMany({
      where: { userId },
    });

    // Delete user categories
    await tx.userCategory.deleteMany({
      where: { userId },
    });

    // Delete refresh tokens
    await tx.refreshToken.deleteMany({
      where: { userId },
    });

    // Delete verification codes
    await tx.verificationCode.deleteMany({
      where: { userId },
    });

    // Delete blocked users relationships
    await tx.blockedUser.deleteMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });

    // Anonymize reviews (keep for job poster/worker stats but remove PII)
    await tx.review.updateMany({
      where: { reviewerId: userId },
      data: {
        comment: '[Silinen kullanıcı]',
      },
    });

    // Delete applications
    await tx.application.deleteMany({
      where: { applicantId: userId },
    });

    // Handle jobs - expire active jobs
    await tx.job.updateMany({
      where: {
        userId: userId,
        status: { in: ['active', 'draft', 'pending_review', 'paused'] },
      },
      data: { status: 'expired' },
    });

    // Delete reports by user (but keep reports against user for moderation history)
    await tx.report.deleteMany({
      where: { reporterId: userId },
    });

    // Finally, anonymize the user record (soft delete)
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.local`,
        firstName: 'Silinen',
        lastName: 'Kullanıcı',
        phone: null,
        bio: null,
        profilePhotoUrl: null,
        locationCity: null,
        locationPostcode: null,
        locationLat: null,
        locationLng: null,
        passwordHash: '',
        status: 'deleted',
        emailVerified: false,
        phoneVerified: false,
        deletedAt: new Date(),
      },
    });
  });

  // Clear all user caches
  await cacheService.del(cacheKeys.user.profile(userId));

  logger.info(`User data deleted: ${userId}`);
}

/**
 * Anonymize old inactive accounts (data minimization)
 */
export async function anonymizeInactiveAccounts(
  inactiveDays: number = 365
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  const inactiveUsers = await prisma.user.findMany({
    where: {
      lastLoginAt: { lt: cutoffDate },
      status: 'active',
      role: 'user', // Only anonymize regular users, not admins
    },
    select: { id: true },
    take: 100, // Process in batches
  });

  let anonymized = 0;

  for (const user of inactiveUsers) {
    try {
      // Send warning email first (in production)
      // For now, just log
      logger.info(`Inactive account flagged for anonymization: ${user.id}`);
      anonymized++;
    } catch (error) {
      logger.error(`Failed to flag inactive account: ${user.id}`, { error });
    }
  }

  return anonymized;
}

/**
 * Get user consent status
 */
export async function getUserConsent(
  userId: string
): Promise<Record<string, boolean>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      marketingConsent: true,
      analyticsConsent: true,
      thirdPartyConsent: true,
    },
  });

  if (!user) {
    throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.USER_NOT_FOUND);
  }

  return {
    marketing: user.marketingConsent ?? false,
    analytics: user.analyticsConsent ?? false,
    thirdParty: user.thirdPartyConsent ?? false,
  };
}

/**
 * Update user consent
 */
export async function updateUserConsent(
  userId: string,
  consents: {
    marketing?: boolean;
    analytics?: boolean;
    thirdParty?: boolean;
  }
): Promise<void> {
  const updateData: Prisma.UserUpdateInput = {};

  if (consents.marketing !== undefined) {
    updateData.marketingConsent = consents.marketing;
  }
  if (consents.analytics !== undefined) {
    updateData.analyticsConsent = consents.analytics;
  }
  if (consents.thirdParty !== undefined) {
    updateData.thirdPartyConsent = consents.thirdParty;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...updateData,
      consentUpdatedAt: new Date(),
    },
  });

  // Invalidate user cache
  await cacheService.del(cacheKeys.user.profile(userId));

  logger.info(`User consent updated: ${userId}`, { consents });
}

export const gdprService = {
  exportUserData,
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  processPendingDeletions,
  deleteUserData,
  anonymizeInactiveAccounts,
  getUserConsent,
  updateUserConsent,
};

export default gdprService;
