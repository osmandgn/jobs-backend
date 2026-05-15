import type { NotificationPayload, NotificationType, NotificationData } from '../types/notification';

interface PayloadInput {
  jobTitle?: string;
  jobId?: string;
  userName?: string;
  userId?: string;
  conversationId?: string;
  applicationId?: string;
  reviewId?: string;
  rating?: number;
  message?: string;
}

export function buildNotificationPayload(
  type: NotificationType,
  input: PayloadInput
): NotificationPayload {
  const data: NotificationData = {
    type,
    ...(input.jobId && { jobId: input.jobId }),
    ...(input.userId && { userId: input.userId }),
    ...(input.conversationId && { conversationId: input.conversationId }),
    ...(input.applicationId && { applicationId: input.applicationId }),
    ...(input.reviewId && { reviewId: input.reviewId }),
  };

  switch (type) {
    case 'new_job_match':
      return {
        title: 'New Job Match!',
        body: input.jobTitle
          ? `"${input.jobTitle}" looks like a great match for you`
          : 'A new job matching your interests is available',
        data,
      };

    case 'application_received':
      return {
        title: 'New Application!',
        body: input.userName
          ? `${input.userName} applied to "${input.jobTitle || 'your job'}"`
          : `New application received for "${input.jobTitle || 'your job'}"`,
        data,
      };

    case 'application_accepted':
      return {
        title: 'Application Accepted!',
        body: input.jobTitle
          ? `Your application for "${input.jobTitle}" has been accepted`
          : 'Your application has been accepted',
        data,
      };

    case 'application_rejected':
      return {
        title: 'Application Update',
        body: input.jobTitle
          ? `Your application for "${input.jobTitle}" was not successful`
          : 'Your application was not successful',
        data,
      };

    case 'new_message':
      return {
        title: input.userName || 'New Message',
        body: input.message
          ? input.message.length > 50
            ? `${input.message.substring(0, 50)}...`
            : input.message
          : 'You have a new message',
        data,
      };

    case 'new_review':
      return {
        title: 'New Review',
        body: input.rating
          ? `${input.userName || 'Someone'} gave you ${input.rating} stars`
          : `${input.userName || 'Someone'} left you a review`,
        data,
      };

    case 'job_reminder':
      return {
        title: 'Job Reminder',
        body: input.jobTitle
          ? `"${input.jobTitle}" starts tomorrow, get ready!`
          : 'You have a job starting tomorrow, get ready!',
        data,
      };

    case 'system':
      return {
        title: 'GigHub UK',
        body: input.message || 'You have a new notification',
        data,
      };

    default:
      return {
        title: 'GigHub UK',
        body: 'You have a new notification',
        data,
      };
  }
}

export function buildPayloadForNewJobMatch(jobId: string, jobTitle: string): NotificationPayload {
  return buildNotificationPayload('new_job_match', { jobId, jobTitle });
}

export function buildPayloadForApplicationReceived(
  applicationId: string,
  jobId: string,
  jobTitle: string,
  applicantName: string
): NotificationPayload {
  return buildNotificationPayload('application_received', {
    applicationId,
    jobId,
    jobTitle,
    userName: applicantName,
  });
}

export function buildPayloadForApplicationAccepted(
  applicationId: string,
  jobId: string,
  jobTitle: string
): NotificationPayload {
  return buildNotificationPayload('application_accepted', {
    applicationId,
    jobId,
    jobTitle,
  });
}

export function buildPayloadForApplicationRejected(
  applicationId: string,
  jobId: string,
  jobTitle: string
): NotificationPayload {
  return buildNotificationPayload('application_rejected', {
    applicationId,
    jobId,
    jobTitle,
  });
}

export function buildPayloadForNewMessage(
  conversationId: string,
  senderName: string,
  messagePreview: string
): NotificationPayload {
  return buildNotificationPayload('new_message', {
    conversationId,
    userName: senderName,
    message: messagePreview,
  });
}

export function buildPayloadForNewReview(
  reviewId: string,
  reviewerName: string,
  rating: number
): NotificationPayload {
  return buildNotificationPayload('new_review', {
    reviewId,
    userName: reviewerName,
    rating,
  });
}

export function buildPayloadForJobReminder(
  jobId: string,
  jobTitle: string
): NotificationPayload {
  return buildNotificationPayload('job_reminder', {
    jobId,
    jobTitle,
  });
}

export default {
  buildNotificationPayload,
  buildPayloadForNewJobMatch,
  buildPayloadForApplicationReceived,
  buildPayloadForApplicationAccepted,
  buildPayloadForApplicationRejected,
  buildPayloadForNewMessage,
  buildPayloadForNewReview,
  buildPayloadForJobReminder,
};
