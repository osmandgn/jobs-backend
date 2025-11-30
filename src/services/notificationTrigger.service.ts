import { prisma } from '../config/database';
import { Job, Application, Review, Message, NotificationType } from '@prisma/client';
import * as pushNotificationService from './pushNotification.service';
import * as notificationPreferenceService from './notificationPreference.service';
import * as jobMatcherService from './jobMatcher.service';
import {
  buildPayloadForNewJobMatch,
  buildPayloadForApplicationReceived,
  buildPayloadForApplicationAccepted,
  buildPayloadForApplicationRejected,
  buildPayloadForNewMessage,
  buildPayloadForNewReview,
  buildPayloadForJobReminder,
} from '../utils/notificationPayload';
import logger from '../utils/logger';

/**
 * Trigger notifications when a new job is created
 * Finds matching users and sends push notifications
 */
export async function onJobCreated(job: Job): Promise<void> {
  try {
    // Find users who match this job
    const matchingUsers = await jobMatcherService.findMatchingUsers(job, job.userId);

    if (matchingUsers.length === 0) {
      logger.info('No matching users for job', { jobId: job.id });
      return;
    }

    const payload = buildPayloadForNewJobMatch(job.id, job.title);

    // Send notifications to each matching user (respecting preferences)
    for (const user of matchingUsers) {
      const shouldSend = await notificationPreferenceService.shouldSendPush(user.userId, 'new_job');

      if (shouldSend) {
        await pushNotificationService.sendAndSaveNotification(
          user.userId,
          'new_job_match',
          payload,
          job.id
        );
      } else {
        // Still save to in-app notifications
        await prisma.notification.create({
          data: {
            userId: user.userId,
            type: 'new_job_match',
            title: payload.title,
            body: payload.body,
            data: payload.data as any,
            relatedJobId: job.id,
          },
        });
      }
    }

    logger.info('Job match notifications sent', {
      jobId: job.id,
      recipientCount: matchingUsers.length,
    });
  } catch (error) {
    logger.error('Failed to send job match notifications', { jobId: job.id, error });
  }
}

/**
 * Trigger notification when a new application is received
 */
export async function onApplicationReceived(
  application: Application,
  job: Job,
  applicantName: string
): Promise<void> {
  try {
    const payload = buildPayloadForApplicationReceived(
      application.id,
      job.id,
      job.title,
      applicantName
    );

    const shouldSend = await notificationPreferenceService.shouldSendPush(job.userId, 'application');

    if (shouldSend) {
      await pushNotificationService.sendAndSaveNotification(
        job.userId,
        'application_received',
        payload,
        job.id,
        application.applicantId
      );
    } else {
      await prisma.notification.create({
        data: {
          userId: job.userId,
          type: 'application_received',
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          relatedJobId: job.id,
          relatedUserId: application.applicantId,
        },
      });
    }

    logger.info('Application received notification sent', {
      applicationId: application.id,
      employerId: job.userId,
    });
  } catch (error) {
    logger.error('Failed to send application received notification', {
      applicationId: application.id,
      error,
    });
  }
}

/**
 * Trigger notification when application is accepted
 */
export async function onApplicationAccepted(
  application: Application,
  job: Job
): Promise<void> {
  try {
    const payload = buildPayloadForApplicationAccepted(application.id, job.id, job.title);

    const shouldSend = await notificationPreferenceService.shouldSendPush(
      application.applicantId,
      'application'
    );

    if (shouldSend) {
      await pushNotificationService.sendAndSaveNotification(
        application.applicantId,
        'application_accepted',
        payload,
        job.id,
        job.userId
      );
    } else {
      await prisma.notification.create({
        data: {
          userId: application.applicantId,
          type: 'application_accepted',
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          relatedJobId: job.id,
          relatedUserId: job.userId,
        },
      });
    }

    logger.info('Application accepted notification sent', {
      applicationId: application.id,
      applicantId: application.applicantId,
    });
  } catch (error) {
    logger.error('Failed to send application accepted notification', {
      applicationId: application.id,
      error,
    });
  }
}

/**
 * Trigger notification when application is rejected
 */
export async function onApplicationRejected(
  application: Application,
  job: Job
): Promise<void> {
  try {
    const payload = buildPayloadForApplicationRejected(application.id, job.id, job.title);

    const shouldSend = await notificationPreferenceService.shouldSendPush(
      application.applicantId,
      'application'
    );

    if (shouldSend) {
      await pushNotificationService.sendAndSaveNotification(
        application.applicantId,
        'application_rejected',
        payload,
        job.id,
        job.userId
      );
    } else {
      await prisma.notification.create({
        data: {
          userId: application.applicantId,
          type: 'application_rejected',
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          relatedJobId: job.id,
          relatedUserId: job.userId,
        },
      });
    }

    logger.info('Application rejected notification sent', {
      applicationId: application.id,
      applicantId: application.applicantId,
    });
  } catch (error) {
    logger.error('Failed to send application rejected notification', {
      applicationId: application.id,
      error,
    });
  }
}

/**
 * Trigger notification when a new message is received
 */
export async function onNewMessage(
  message: Message,
  conversationId: string,
  recipientId: string,
  senderName: string
): Promise<void> {
  try {
    const payload = buildPayloadForNewMessage(conversationId, senderName, message.content);

    const shouldSend = await notificationPreferenceService.shouldSendPush(recipientId, 'message');

    if (shouldSend) {
      await pushNotificationService.sendAndSaveNotification(
        recipientId,
        'new_message',
        payload,
        undefined,
        message.senderId
      );
    } else {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'new_message',
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          relatedUserId: message.senderId,
        },
      });
    }

    logger.info('New message notification sent', {
      conversationId,
      recipientId,
    });
  } catch (error) {
    logger.error('Failed to send new message notification', {
      conversationId,
      error,
    });
  }
}

/**
 * Trigger notification when a new review is received
 */
export async function onNewReview(
  review: Review,
  reviewerName: string
): Promise<void> {
  try {
    const payload = buildPayloadForNewReview(review.id, reviewerName, review.rating);

    const shouldSend = await notificationPreferenceService.shouldSendPush(
      review.revieweeId,
      'review'
    );

    if (shouldSend) {
      await pushNotificationService.sendAndSaveNotification(
        review.revieweeId,
        'new_review',
        payload,
        review.jobId,
        review.reviewerId
      );
    } else {
      await prisma.notification.create({
        data: {
          userId: review.revieweeId,
          type: 'new_review',
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          relatedJobId: review.jobId,
          relatedUserId: review.reviewerId,
        },
      });
    }

    logger.info('New review notification sent', {
      reviewId: review.id,
      revieweeId: review.revieweeId,
    });
  } catch (error) {
    logger.error('Failed to send new review notification', {
      reviewId: review.id,
      error,
    });
  }
}

/**
 * Trigger job reminder notification 24 hours before job date
 */
export async function sendJobReminder(
  userId: string,
  job: Job
): Promise<void> {
  try {
    const payload = buildPayloadForJobReminder(job.id, job.title);

    // Job reminders are always sent (system notifications)
    await pushNotificationService.sendAndSaveNotification(
      userId,
      'job_reminder',
      payload,
      job.id
    );

    logger.info('Job reminder notification sent', {
      jobId: job.id,
      userId,
    });
  } catch (error) {
    logger.error('Failed to send job reminder notification', {
      jobId: job.id,
      userId,
      error,
    });
  }
}

/**
 * Send system notification to a user
 */
export async function sendSystemNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const payload = {
      title,
      body,
      data: {
        type: 'system' as const,
        ...data,
      },
    };

    await pushNotificationService.sendAndSaveNotification(userId, 'system', payload);

    logger.info('System notification sent', { userId });
  } catch (error) {
    logger.error('Failed to send system notification', { userId, error });
  }
}

/**
 * Send bulk system notification to multiple users
 */
export async function sendBulkSystemNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  for (const userId of userIds) {
    await sendSystemNotification(userId, title, body, data);
  }
}

export default {
  onJobCreated,
  onApplicationReceived,
  onApplicationAccepted,
  onApplicationRejected,
  onNewMessage,
  onNewReview,
  sendJobReminder,
  sendSystemNotification,
  sendBulkSystemNotification,
};
