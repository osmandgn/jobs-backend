import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get total unread message count for badge
 * @access  Private
 */
router.get(
  '/unread-count',
  messageController.getUnreadCount.bind(messageController)
);

export default router;
