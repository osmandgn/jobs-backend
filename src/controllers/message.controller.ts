import { Request, Response, NextFunction } from 'express';
import { conversationService } from '../services/conversation.service';
import { messageService } from '../services/message.service';
import { sendSuccess, sendNoContent, sendPaginated } from '../utils/response';
import { BadRequestError, ErrorCodes } from '../utils/AppError';
import {
  conversationIdSchema,
  messageIdSchema,
  getConversationsQuerySchema,
  getMessagesQuerySchema,
  sendMessageSchema,
} from '../validators/message.validator';

class MessageController {
  /**
   * GET /api/v1/conversations
   * Get user's conversations
   */
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const query = getConversationsQuerySchema.parse(req.query);
      const result = await conversationService.getUserConversations(userId, query);

      sendPaginated(res, result.conversations, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/conversations/:id
   * Get conversation detail
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = conversationIdSchema.parse(req.params);
      const conversation = await conversationService.getConversationById(id, userId);

      sendSuccess(res, conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/conversations/:id/messages
   * Get messages in a conversation
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = conversationIdSchema.parse(req.params);
      const query = getMessagesQuerySchema.parse(req.query);

      const result = await messageService.getMessages(id, userId, query);

      sendPaginated(res, result.messages, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/conversations/:id/messages
   * Send a message
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = conversationIdSchema.parse(req.params);
      const data = sendMessageSchema.parse(req.body);

      const message = await messageService.sendMessage(id, userId, data);

      sendSuccess(res, message, 'Mesaj gönderildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/conversations/:id/read
   * Mark conversation as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = conversationIdSchema.parse(req.params);
      const result = await messageService.markConversationAsRead(id, userId);

      sendSuccess(res, result, 'Mesajlar okundu olarak işaretlendi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/conversations/:id
   * Delete (soft) conversation
   */
  async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = conversationIdSchema.parse(req.params);
      await conversationService.deleteConversation(id, userId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/conversations/:id/messages/:messageId
   * Delete a message
   */
  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = conversationIdSchema.parse(req.params);
      const { messageId } = messageIdSchema.parse(req.params);

      await messageService.deleteMessage(id, messageId, userId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/messages/unread-count
   * Get total unread message count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const count = await conversationService.getTotalUnreadCount(userId);

      sendSuccess(res, { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
export default messageController;
