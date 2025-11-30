import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { cacheService } from './cache.service';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenRemainingTime,
} from '../utils/jwt';
import { UnauthorizedError, ErrorCodes } from '../utils/AppError';
import logger from '../utils/logger';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class TokenService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async generateTokens(userId: string, email: string, role: 'user' | 'admin'): Promise<TokenPair> {
    // Generate access token
    const accessToken = generateAccessToken({ userId, email, role });

    // Generate refresh token with unique ID
    const tokenId = uuidv4();
    const refreshToken = generateRefreshToken({ userId, tokenId });

    // Hash and store refresh token
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError(
        'Invalid refresh token',
        ErrorCodes.AUTH_REFRESH_TOKEN_INVALID
      );
    }

    // Find token in database
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedError(
        'Invalid or expired refresh token',
        ErrorCodes.AUTH_REFRESH_TOKEN_INVALID
      );
    }

    // Check user status
    if (storedToken.user.status !== 'active') {
      // Revoke the token
      await this.revokeToken(refreshToken);
      throw new UnauthorizedError(
        'Account is not active',
        ErrorCodes.AUTH_USER_SUSPENDED
      );
    }

    // Rotate refresh token (generate new one, revoke old)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    // Generate new token pair
    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    );
  }

  async revokeToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });

    logger.info(`Revoked ${result.count} refresh tokens for user ${userId}`);
    return result.count;
  }

  async blacklistAccessToken(accessToken: string): Promise<void> {
    const remainingTime = getTokenRemainingTime(accessToken);
    if (remainingTime > 0) {
      await cacheService.addToBlacklist(accessToken, remainingTime);
    }
  }

  async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
    return cacheService.isBlacklisted(accessToken);
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    logger.info(`Cleaned up ${result.count} expired/revoked refresh tokens`);
    return result.count;
  }
}

export const tokenService = new TokenService();
export default tokenService;
