import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/conversations
 * @desc    Get user's conversations
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 50)
 */
router.get('/', messageController.getConversations.bind(messageController));

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get total unread message count
 * @access  Private
 */
router.get(
  '/unread-count',
  messageController.getUnreadCount.bind(messageController)
);

/**
 * @route   GET /api/v1/conversations/:id
 * @desc    Get conversation detail
 * @access  Private (participant only)
 */
router.get('/:id', messageController.getConversation.bind(messageController));

/**
 * @route   DELETE /api/v1/conversations/:id
 * @desc    Delete (soft) conversation
 * @access  Private (participant only)
 */
router.delete('/:id', messageController.deleteConversation.bind(messageController));

/**
 * @route   GET /api/v1/conversations/:id/messages
 * @desc    Get messages in a conversation
 * @access  Private (participant only)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50, max: 100)
 * @query   before - Get messages before this timestamp (ISO string)
 * @query   after - Get messages after this timestamp (ISO string)
 */
router.get(
  '/:id/messages',
  messageController.getMessages.bind(messageController)
);

/**
 * @route   POST /api/v1/conversations/:id/messages
 * @desc    Send a message
 * @access  Private (participant only)
 * @body    { content: string }
 */
router.post(
  '/:id/messages',
  messageController.sendMessage.bind(messageController)
);

/**
 * @route   DELETE /api/v1/conversations/:id/messages/:messageId
 * @desc    Delete a message (only own messages)
 * @access  Private (message sender only)
 */
router.delete(
  '/:id/messages/:messageId',
  messageController.deleteMessage.bind(messageController)
);

/**
 * @route   PATCH /api/v1/conversations/:id/read
 * @desc    Mark all messages in conversation as read
 * @access  Private (participant only)
 */
router.patch(
  '/:id/read',
  messageController.markAsRead.bind(messageController)
);

export default router;
