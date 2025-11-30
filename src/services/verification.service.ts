import { prisma } from '../config/database';
import { VerificationType } from '@prisma/client';
import logger from '../utils/logger';

const CODE_LENGTH = 6;
const EMAIL_VERIFICATION_EXPIRY_MINUTES = 15;
const PHONE_VERIFICATION_EXPIRY_MINUTES = 10;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;

export class VerificationService {
  generateCode(): string {
    // Generate a 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  private getExpiryMinutes(type: VerificationType): number {
    switch (type) {
      case 'email':
        return EMAIL_VERIFICATION_EXPIRY_MINUTES;
      case 'phone':
        return PHONE_VERIFICATION_EXPIRY_MINUTES;
      case 'password_reset':
        return PASSWORD_RESET_EXPIRY_MINUTES;
      default:
        return EMAIL_VERIFICATION_EXPIRY_MINUTES;
    }
  }

  async createVerificationCode(userId: string, type: VerificationType): Promise<string> {
    // Invalidate any existing codes of the same type
    await prisma.verificationCode.updateMany({
      where: {
        userId,
        type,
        used: false,
      },
      data: {
        used: true,
      },
    });

    const code = this.generateCode();
    const expiryMinutes = this.getExpiryMinutes(type);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId,
        code,
        type,
        expiresAt,
      },
    });

    logger.debug(`Verification code created for user ${userId}, type: ${type}`);
    return code;
  }

  async verifyCode(
    userId: string,
    code: string,
    type: VerificationType
  ): Promise<{ valid: boolean; message: string }> {
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        type,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationCode) {
      // Check if code exists but is expired
      const expiredCode = await prisma.verificationCode.findFirst({
        where: {
          userId,
          code,
          type,
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      if (expiredCode) {
        return { valid: false, message: 'Verification code has expired' };
      }

      return { valid: false, message: 'Invalid verification code' };
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

    return { valid: true, message: 'Code verified successfully' };
  }

  async getRecentCodeCount(userId: string, type: VerificationType, hours: number): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const count = await prisma.verificationCode.count({
      where: {
        userId,
        type,
        createdAt: {
          gte: since,
        },
      },
    });

    return count;
  }

  async cleanupExpiredCodes(): Promise<number> {
    const result = await prisma.verificationCode.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24 hours
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired verification codes`);
    return result.count;
  }
}

export const verificationService = new VerificationService();
export default verificationService;
