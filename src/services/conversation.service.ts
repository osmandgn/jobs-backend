import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ErrorCodes,
} from '../utils/AppError';
import logger from '../utils/logger';
import type { GetConversationsQuery } from '../validators/message.validator';

export interface ConversationListItem {
  id: string;
  job: {
    id: string;
    title: string;
    status: string;
  };
  otherParty: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: Date;
  } | null;
  unreadCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface ConversationDetail {
  id: string;
  job: {
    id: string;
    title: string;
    status: string;
    payAmount: number;
    payType: string;
    jobDate: Date | null;
  };
  employer: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  application: {
    id: string;
    status: string;
  } | null;
  createdAt: Date;
}

class ConversationService {
  /**
   * Get user's conversations with pagination
   */
  async getUserConversations(
    userId: string,
    query: GetConversationsQuery
  ): Promise<{
    conversations: ConversationListItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit } = query;

    // Get conversations where user is a participant and not deleted
    const where: Prisma.ConversationWhereInput = {
      OR: [
        { employerId: userId, isEmployerDeleted: false },
        { applicantId: userId, isApplicantDeleted: false },
      ],
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          employer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              content: true,
              senderId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    // Get unread counts for each conversation
    const conversationIds = conversations.map((c) => c.id);
    const unreadCounts = await this.getUnreadCountsForConversations(
      conversationIds,
      userId
    );

    const conversationList: ConversationListItem[] = conversations.map((conv) => {
      const isEmployer = conv.employerId === userId;
      const otherParty = isEmployer ? conv.applicant : conv.employer;
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        job: conv.job,
        otherParty,
        lastMessage: lastMessage
          ? {
              content:
                lastMessage.content.length > 100
                  ? lastMessage.content.substring(0, 100) + '...'
                  : lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: unreadCounts.get(conv.id) || 0,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
      };
    });

    return {
      conversations: conversationList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get conversation detail by ID
   */
  async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<ConversationDetail> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            payAmount: true,
            payType: true,
            jobDate: true,
          },
        },
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Konuşma bulunamadı', ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    // Check user is participant
    const isEmployer = conversation.employerId === userId;
    const isApplicant = conversation.applicantId === userId;

    if (!isEmployer && !isApplicant) {
      throw new ForbiddenError(
        'Bu konuşmayı görüntüleme yetkiniz yok',
        ErrorCodes.FORBIDDEN
      );
    }

    // Check not soft-deleted for this user
    if ((isEmployer && conversation.isEmployerDeleted) ||
        (isApplicant && conversation.isApplicantDeleted)) {
      throw new NotFoundError('Konuşma bulunamadı', ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    // Get application info
    const application = await prisma.application.findFirst({
      where: {
        jobId: conversation.jobId,
        applicantId: conversation.applicantId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return {
      id: conversation.id,
      job: {
        ...conversation.job,
        payAmount: Number(conversation.job.payAmount),
      },
      employer: conversation.employer,
      applicant: conversation.applicant,
      application,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Validate user can access conversation
   */
  async validateConversationAccess(
    conversationId: string,
    userId: string
  ): Promise<{
    conversation: ConversationDetail;
    isEmployer: boolean;
    otherPartyId: string;
  }> {
    const conversation = await this.getConversationById(conversationId, userId);
    const isEmployer = conversation.employer.id === userId;
    const otherPartyId = isEmployer
      ? conversation.applicant.id
      : conversation.employer.id;

    return { conversation, isEmployer, otherPartyId };
  }

  /**
   * Soft delete conversation for a user
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        employerId: true,
        applicantId: true,
        isEmployerDeleted: true,
        isApplicantDeleted: true,
      },
    });

    if (!conversation) {
      throw new NotFoundError('Konuşma bulunamadı', ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    const isEmployer = conversation.employerId === userId;
    const isApplicant = conversation.applicantId === userId;

    if (!isEmployer && !isApplicant) {
      throw new ForbiddenError(
        'Bu konuşmayı silme yetkiniz yok',
        ErrorCodes.FORBIDDEN
      );
    }

    const updateData: Prisma.ConversationUpdateInput = isEmployer
      ? { isEmployerDeleted: true }
      : { isApplicantDeleted: true };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    logger.info(`Conversation ${conversationId} deleted by user ${userId}`);
  }

  /**
   * Get total unread message count for a user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    // Get all conversation IDs where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { employerId: userId, isEmployerDeleted: false },
          { applicantId: userId, isApplicantDeleted: false },
        ],
      },
      select: { id: true },
    });

    if (conversations.length === 0) return 0;

    // Count unread messages where sender is not the current user
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return unreadCount;
  }

  /**
   * Get unread counts for multiple conversations
   */
  private async getUnreadCountsForConversations(
    conversationIds: string[],
    userId: string
  ): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();

    const counts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
      _count: { id: true },
    });

    const map = new Map<string, number>();
    counts.forEach((c) => {
      map.set(c.conversationId, c._count.id);
    });

    return map;
  }

  /**
   * Find or get conversation by job and applicant
   */
  async findConversation(
    jobId: string,
    applicantId: string
  ): Promise<string | null> {
    const conversation = await prisma.conversation.findFirst({
      where: { jobId, applicantId },
      select: { id: true },
    });

    return conversation?.id || null;
  }
}

export const conversationService = new ConversationService();
export default conversationService;
