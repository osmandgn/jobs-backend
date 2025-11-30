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
        title: 'Yeni İş İlanı!',
        body: input.jobTitle
          ? `"${input.jobTitle}" ilanı ilgi alanınıza uygun görünüyor`
          : 'İlgi alanınıza uygun yeni bir iş ilanı var',
        data,
      };

    case 'application_received':
      return {
        title: 'Yeni Başvuru!',
        body: input.userName
          ? `${input.userName} "${input.jobTitle || 'ilanınıza'}" başvurdu`
          : `"${input.jobTitle || 'İlanınıza'}" yeni bir başvuru geldi`,
        data,
      };

    case 'application_accepted':
      return {
        title: 'Başvurunuz Kabul Edildi! 🎉',
        body: input.jobTitle
          ? `"${input.jobTitle}" için başvurunuz kabul edildi`
          : 'Başvurunuz kabul edildi',
        data,
      };

    case 'application_rejected':
      return {
        title: 'Başvuru Sonucu',
        body: input.jobTitle
          ? `"${input.jobTitle}" için başvurunuz reddedildi`
          : 'Başvurunuz reddedildi',
        data,
      };

    case 'new_message':
      return {
        title: input.userName || 'Yeni Mesaj',
        body: input.message
          ? input.message.length > 50
            ? `${input.message.substring(0, 50)}...`
            : input.message
          : 'Yeni bir mesajınız var',
        data,
      };

    case 'new_review':
      return {
        title: 'Yeni Değerlendirme',
        body: input.rating
          ? `${input.userName || 'Biri'} size ${input.rating} yıldız verdi`
          : `${input.userName || 'Biri'} size değerlendirme bıraktı`,
        data,
      };

    case 'job_reminder':
      return {
        title: 'İş Hatırlatması',
        body: input.jobTitle
          ? `"${input.jobTitle}" yarın başlıyor, hazır olun!`
          : 'Yarın bir işiniz var, hazır olun!',
        data,
      };

    case 'system':
      return {
        title: 'GigHub UK',
        body: input.message || 'Yeni bir bildiriminiz var',
        data,
      };

    default:
      return {
        title: 'GigHub UK',
        body: 'Yeni bir bildiriminiz var',
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
