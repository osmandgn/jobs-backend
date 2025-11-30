export type NotificationType =
  | 'new_job_match'
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'new_message'
  | 'new_review'
  | 'job_reminder'
  | 'system';

export type Platform = 'ios' | 'android' | 'web';

export interface NotificationData {
  type: NotificationType;
  jobId?: string;
  conversationId?: string;
  userId?: string;
  applicationId?: string;
  reviewId?: string;
  [key: string]: string | undefined;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: NotificationData;
  imageUrl?: string;
}

export interface PushMessage {
  token: string;
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'high' | 'normal';
    notification: {
      channelId: string;
      sound?: string;
      icon?: string;
      color?: string;
    };
  };
  apns?: {
    payload: {
      aps: {
        sound?: string;
        badge?: number;
        'content-available'?: number;
      };
    };
  };
  webpush?: {
    notification: {
      icon?: string;
    };
  };
}

export interface BatchSendResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}
