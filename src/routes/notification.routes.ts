import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/notifications - Get my notifications
router.get('/', notificationController.getNotifications.bind(notificationController));

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

// GET /api/notifications/status - Get push notification status
router.get('/status', notificationController.getPushStatus.bind(notificationController));

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', notificationController.markAllAsRead.bind(notificationController));

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', notificationController.markAsRead.bind(notificationController));

// GET /api/notifications/preferences - Get notification preferences
router.get('/preferences', notificationController.getPreferences.bind(notificationController));

// PUT /api/notifications/preferences - Update notification preferences
router.put('/preferences', notificationController.updatePreferences.bind(notificationController));

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

export default router;
