import type { Request, Response, NextFunction } from 'express';
import * as pushNotificationService from '../services/pushNotification.service';
import * as notificationPreferenceService from '../services/notificationPreference.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import { NotFoundError, ValidationError, ErrorCodes } from '../utils/AppError';
import { prisma } from '../config/database';

class NotificationController {
  /**
   * GET /notifications - Get user's notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await pushNotificationService.getUserNotifications(userId, page, limit);

      sendSuccess(res, {
        notifications: result.notifications,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/unread-count - Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const count = await pushNotificationService.getUnreadCount(userId);

      sendSuccess(res, { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/:id/read - Mark notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.id as string;

      const success = await pushNotificationService.markAsRead(notificationId, userId);

      if (!success) {
        throw new NotFoundError('Bildirim bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/read-all - Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const count = await pushNotificationService.markAllAsRead(userId);

      sendSuccess(res, { markedCount: count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/status - Check if push notifications are enabled
   */
  async getPushStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enabled = pushNotificationService.isPushNotificationEnabled();

      sendSuccess(res, { pushNotificationsEnabled: enabled });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/preferences - Get notification preferences
   */
  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const preferences = await notificationPreferenceService.getPreferences(userId);

      sendSuccess(res, { preferences });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/preferences - Update notification preferences
   */
  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const updates = req.body;

      // Validate email frequency if provided
      if (updates.newJobEmailFrequency) {
        const validFrequencies = ['instant', 'daily', 'weekly'];
        if (!validFrequencies.includes(updates.newJobEmailFrequency)) {
          throw new ValidationError(
            'Geçersiz email frekansı. "instant", "daily" veya "weekly" olmalıdır',
            ErrorCodes.VALIDATION_FAILED
          );
        }
      }

      const preferences = await notificationPreferenceService.updatePreferences(userId, updates);

      sendSuccess(res, { preferences });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /notifications/:id - Delete a notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.id as string;

      const result = await prisma.notification.deleteMany({
        where: { id: notificationId, userId },
      });

      if (result.count === 0) {
        throw new NotFoundError('Bildirim bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
export default notificationController;
