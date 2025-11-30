import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import {
  NotFoundError,
  BadRequestError,
  ErrorCodes,
} from '../utils/AppError';
import logger from '../utils/logger';
import type { BlockUserInput, GetBlockedUsersQuery } from '../validators/report.validator';

export interface BlockedUserItem {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  blockedAt: Date;
  reason: string | null;
}

class BlockService {
  /**
   * Check if user A has blocked user B
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
    return !!block;
  }

  /**
   * Check if there is any block between two users (either direction)
   */
  async hasBlockRelation(userId1: string, userId2: string): Promise<boolean> {
    const block = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });
    return !!block;
  }

  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    input: BlockUserInput
  ): Promise<void> {
    // Can't block yourself
    if (blockerId === blockedId) {
      throw new BadRequestError(
        'Kendinizi engelleyemezsiniz',
        ErrorCodes.BAD_REQUEST
      );
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true, status: true },
    });

    if (!userExists || userExists.status === 'deleted') {
      throw new NotFoundError('Kullanıcı bulunamadı', ErrorCodes.USER_NOT_FOUND);
    }

    // Check if already blocked
    const existingBlock = await this.isBlocked(blockerId, blockedId);
    if (existingBlock) {
      throw new BadRequestError(
        'Bu kullanıcı zaten engellenmiş',
        ErrorCodes.USER_BLOCKED
      );
    }

    // Create block
    await prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId,
        reason: input.reason,
      },
    });

    logger.info(`User ${blockerId} blocked user ${blockedId}`);
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!block) {
      throw new NotFoundError(
        'Bu kullanıcı engellenmemiş',
        ErrorCodes.NOT_FOUND
      );
    }

    await prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    logger.info(`User ${blockerId} unblocked user ${blockedId}`);
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(
    userId: string,
    query: GetBlockedUsersQuery
  ): Promise<{
    users: BlockedUserItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit } = query;

    const where: Prisma.BlockedUserWhereInput = {
      blockerId: userId,
    };

    const [blockedUsers, total] = await Promise.all([
      prisma.blockedUser.findMany({
        where,
        include: {
          blocked: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blockedUser.count({ where }),
    ]);

    return {
      users: blockedUsers.map((b) => ({
        id: b.blocked.id,
        firstName: b.blocked.firstName,
        lastName: b.blocked.lastName,
        profilePhotoUrl: b.blocked.profilePhotoUrl,
        blockedAt: b.createdAt,
        reason: b.reason,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get list of users who blocked the current user
   * (For internal use, to filter out content from users who blocked them)
   */
  async getBlockedByList(userId: string): Promise<string[]> {
    const blockers = await prisma.blockedUser.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });
    return blockers.map((b) => b.blockerId);
  }

  /**
   * Get list of users blocked by the current user
   * (For internal use, to filter out content)
   */
  async getBlockedList(userId: string): Promise<string[]> {
    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    return blocked.map((b) => b.blockedId);
  }

  /**
   * Get all users to exclude from queries (both directions)
   */
  async getExcludedUsers(userId: string): Promise<string[]> {
    const [blockedBy, blocked] = await Promise.all([
      this.getBlockedByList(userId),
      this.getBlockedList(userId),
    ]);
    return [...new Set([...blockedBy, ...blocked])];
  }
}

export const blockService = new BlockService();
export default blockService;
