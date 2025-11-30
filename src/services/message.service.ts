import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ErrorCodes,
} from '../utils/AppError';
import { conversationService } from './conversation.service';
import logger from '../utils/logger';
import type {
  SendMessageInput,
  GetMessagesQuery,
} from '../validators/message.validator';

export interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  isRead: boolean;
  createdAt: Date;
}

class MessageService {
  /**
   * Get messages in a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesQuery
  ): Promise<{
    messages: MessageItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Validate access
    await conversationService.validateConversationAccess(conversationId, userId);

    const { page, limit, before, after } = query;

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(before && { createdAt: { lt: new Date(before) } }),
      ...(after && { createdAt: { gt: new Date(after) } }),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' }, // Newest first for initial load
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Reverse to show oldest first in the batch (for chat UI)
    const messageList: MessageItem[] = messages.reverse().map((msg) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.senderId,
      sender: msg.sender,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
    }));

    return {
      messages: messageList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    data: SendMessageInput
  ): Promise<MessageItem> {
    // Validate access and get conversation details
    const { conversation, otherPartyId } =
      await conversationService.validateConversationAccess(conversationId, senderId);

    // Check if other party allows messages (unless application was accepted)
    const otherParty = await prisma.user.findUnique({
      where: { id: otherPartyId },
      select: { allowMessages: true, status: true },
    });

    if (!otherParty || otherParty.status !== 'active') {
      throw new BadRequestError(
        'Bu kullanıcıya mesaj gönderemezsiniz',
        ErrorCodes.MESSAGE_RECIPIENT_NOT_AVAILABLE
      );
    }

    // Check if blocked
    const isBlocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: otherPartyId, blockedId: senderId },
          { blockerId: senderId, blockedId: otherPartyId },
        ],
      },
    });

    if (isBlocked) {
      throw new ForbiddenError(
        'Bu kullanıcıya mesaj gönderemezsiniz',
        ErrorCodes.USER_BLOCKED
      );
    }

    // Check allowMessages setting (bypass if application was accepted)
    if (!otherParty.allowMessages) {
      const application = conversation.application;
      if (!application || application.status !== 'accepted') {
        throw new BadRequestError(
          'Bu kullanıcı mesaj almayı kapatmış',
          ErrorCodes.MESSAGE_NOT_ALLOWED
        );
      }
    }

    // Sanitize content (basic - remove HTML tags)
    const sanitizedContent = data.content
      .replace(/<[^>]*>/g, '')
      .trim();

    // Create message and update conversation
    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content: sanitizedContent,
          isRead: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
        },
      });

      // Update conversation's last message timestamp
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      return newMessage;
    });

    logger.info(
      `Message sent in conversation ${conversationId} by user ${senderId}`
    );

    // TODO: Trigger push notification to recipient

    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      sender: message.sender,
      isRead: message.isRead,
      createdAt: message.createdAt,
    };
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<{ markedCount: number }> {
    // Validate access
    await conversationService.validateConversationAccess(conversationId, userId);

    // Mark all messages from other users as read
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    if (result.count > 0) {
      logger.info(
        `Marked ${result.count} messages as read in conversation ${conversationId}`
      );
    }

    return { markedCount: result.count };
  }

  /**
   * Delete a specific message (soft delete - only hide from sender)
   * Note: For simplicity, we'll just remove the message entirely if sender owns it
   */
  async deleteMessage(
    conversationId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    // Validate conversation access
    await conversationService.validateConversationAccess(conversationId, userId);

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true },
    });

    if (!message) {
      throw new NotFoundError('Mesaj bulunamadı', ErrorCodes.MESSAGE_NOT_FOUND);
    }

    if (message.conversationId !== conversationId) {
      throw new BadRequestError(
        'Mesaj bu konuşmaya ait değil',
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Only sender can delete their own message
    if (message.senderId !== userId) {
      throw new ForbiddenError(
        'Sadece kendi mesajınızı silebilirsiniz',
        ErrorCodes.FORBIDDEN
      );
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId },
    });

    logger.info(`Message ${messageId} deleted by user ${userId}`);
  }
}

export const messageService = new MessageService();
export default messageService;
