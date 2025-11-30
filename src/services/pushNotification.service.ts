import { getMessaging, isFirebaseConfigured } from '../config/firebase';
import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';
import type { NotificationPayload, PushMessage, BatchSendResult } from '../types/notification';
import * as deviceService from './device.service';
import logger from '../utils/logger';

const ANDROID_CHANNEL_ID = 'gighub_default';
const DEFAULT_ICON = 'notification_icon';
const DEFAULT_COLOR = '#4F46E5';

/**
 * Build platform-specific push message
 */
function buildPushMessage(token: string, payload: NotificationPayload): PushMessage {
  const message: PushMessage = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    },
    data: payload.data
      ? Object.entries(payload.data).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          },
          {} as Record<string, string>
        )
      : undefined,
    android: {
      priority: 'high',
      notification: {
        channelId: ANDROID_CHANNEL_ID,
        sound: 'default',
        icon: DEFAULT_ICON,
        color: DEFAULT_COLOR,
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'content-available': 1,
        },
      },
    },
    webpush: {
      notification: {
        icon: '/icons/notification-icon.png',
      },
    },
  };

  return message;
}

/**
 * Send push notification to a single device
 */
export async function sendToDevice(
  token: string,
  payload: NotificationPayload
): Promise<boolean> {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('Firebase not configured, skipping push notification');
    return false;
  }

  try {
    const message = buildPushMessage(token, payload);
    await messaging.send(message as any);
    logger.info('Push notification sent', { token: token.substring(0, 20) + '...' });
    return true;
  } catch (error: any) {
    // Handle invalid tokens
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      await deviceService.removeInvalidTokens([token]);
      logger.warn('Invalid token removed', { error: error.code });
    } else {
      logger.error('Failed to send push notification', { error });
    }
    return false;
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendToDevices(
  tokens: string[],
  payload: NotificationPayload
): Promise<BatchSendResult> {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('Firebase not configured, skipping batch push notification');
    return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  const messages = tokens.map((token) => buildPushMessage(token, payload));

  try {
    const response = await messaging.sendEach(messages as any);

    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          const token = tokens[idx];
          if (token) {
            failedTokens.push(token);
          }
        }
      }
    });

    // Remove invalid tokens
    if (failedTokens.length > 0) {
      await deviceService.removeInvalidTokens(failedTokens);
    }

    logger.info('Batch push notifications sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    logger.error('Failed to send batch push notifications', { error });
    return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
  }
}

/**
 * Send push notification to a user (all their devices)
 */
export async function sendToUser(
  userId: string,
  payload: NotificationPayload
): Promise<BatchSendResult> {
  const devices = await deviceService.getUserDevices(userId);
  const tokens = devices.map((d) => d.token);

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  return sendToDevices(tokens, payload);
}

/**
 * Send push notification to multiple users
 */
export async function sendToUsers(
  userIds: string[],
  payload: NotificationPayload
): Promise<BatchSendResult> {
  const devices = await deviceService.getDeviceTokensForUsers(userIds);
  const tokens = devices.map((d) => d.token);

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  return sendToDevices(tokens, payload);
}

/**
 * Send push notification and save to database
 */
export async function sendAndSaveNotification(
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
  relatedJobId?: string,
  relatedUserId?: string
): Promise<void> {
  // Save notification to database
  await prisma.notification.create({
    data: {
      userId,
      type,
      title: payload.title,
      body: payload.body,
      data: payload.data as any,
      relatedJobId,
      relatedUserId,
    },
  });

  // Check user notification preferences
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  // Default to true if no preferences set
  let shouldSendPush = true;

  if (prefs) {
    switch (type) {
      case 'new_job_match':
        shouldSendPush = prefs.newJobPush;
        break;
      case 'application_received':
      case 'application_accepted':
      case 'application_rejected':
        shouldSendPush = prefs.applicationPush;
        break;
      case 'new_message':
        shouldSendPush = prefs.messagePush;
        break;
      case 'new_review':
        shouldSendPush = prefs.reviewPush;
        break;
      case 'job_reminder':
      case 'system':
        shouldSendPush = true; // Always send system notifications
        break;
    }
  }

  if (shouldSendPush) {
    await sendToUser(userId, payload);
  }
}

/**
 * Get user's notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  notifications: any[];
  total: number;
  unreadCount: number;
}> {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        isRead: true,
        relatedJobId: true,
        relatedUserId: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  return result.count > 0;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Delete old notifications
 */
export async function deleteOldNotifications(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true,
    },
  });

  logger.info('Old notifications deleted', { count: result.count, daysOld });
  return result.count;
}

/**
 * Check if Firebase is properly configured
 */
export function isPushNotificationEnabled(): boolean {
  return isFirebaseConfigured();
}

export default {
  sendToDevice,
  sendToDevices,
  sendToUser,
  sendToUsers,
  sendAndSaveNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteOldNotifications,
  isPushNotificationEnabled,
};
