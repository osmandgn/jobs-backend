import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { verificationService } from './verification.service';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { normalizeUKPhone } from '../utils/phoneValidator';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ErrorCodes,
} from '../utils/AppError';
import logger from '../utils/logger';
import type { RegisterInput } from '../validators/auth.validator';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(data: RegisterInput): Promise<{ userId: string; email: string }> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered', ErrorCodes.USER_EMAIL_EXISTS);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        emailVerified: false,
      },
    });

    // Create default notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
      },
    });

    // Generate and send verification code
    const code = await verificationService.createVerificationCode(user.id, 'email');
    await emailService.sendVerificationEmail(user.email, code, user.firstName);

    logger.info(`User registered: ${user.email}`);

    return { userId: user.id, email: user.email };
  }

  async verifyEmail(userId: string, code: string): Promise<boolean> {
    const result = await verificationService.verifyCode(userId, code, 'email');

    if (!result.valid) {
      throw new BadRequestError(result.message, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.firstName);

    logger.info(`Email verified for user: ${user.email}`);
    return true;
  }

  async resendVerification(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return true;
    }

    if (user.emailVerified) {
      throw new BadRequestError('Email already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    // Check rate limit (3 per hour)
    const recentCount = await verificationService.getRecentCodeCount(user.id, 'email', 1);
    if (recentCount >= 3) {
      throw new BadRequestError(
        'Too many verification requests. Please try again later.',
        ErrorCodes.RATE_LIMIT_EXCEEDED
      );
    }

    const code = await verificationService.createVerificationCode(user.id, 'email');
    await emailService.sendVerificationEmail(user.email, code, user.firstName);

    return true;
  }

  async sendPhoneVerification(userId: string, phone: string): Promise<boolean> {
    const normalizedPhone = normalizeUKPhone(phone);

    if (!normalizedPhone) {
      throw new BadRequestError('Invalid UK phone number', ErrorCodes.VALIDATION_INVALID_PHONE);
    }

    // Check if phone already used by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        phoneVerified: true,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new ConflictError('Phone number already in use', ErrorCodes.USER_PHONE_EXISTS);
    }

    // Update user's phone
    await prisma.user.update({
      where: { id: userId },
      data: { phone: normalizedPhone, phoneVerified: false },
    });

    // Check rate limit
    const recentCount = await verificationService.getRecentCodeCount(userId, 'phone', 1);
    if (recentCount >= 3) {
      throw new BadRequestError(
        'Too many verification requests. Please try again later.',
        ErrorCodes.RATE_LIMIT_EXCEEDED
      );
    }

    const code = await verificationService.createVerificationCode(userId, 'phone');
    await smsService.sendVerificationCode(normalizedPhone, code);

    return true;
  }

  async verifyPhone(userId: string, code: string): Promise<boolean> {
    const result = await verificationService.verifyCode(userId, code, 'phone');

    if (!result.valid) {
      throw new BadRequestError(result.message, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });

    logger.info(`Phone verified for user: ${userId}`);
    return true;
  }

  async forgotPassword(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return true;
    }

    // Check rate limit
    const recentCount = await verificationService.getRecentCodeCount(user.id, 'password_reset', 1);
    if (recentCount >= 3) {
      throw new BadRequestError(
        'Too many reset requests. Please try again later.',
        ErrorCodes.RATE_LIMIT_EXCEEDED
      );
    }

    const code = await verificationService.createVerificationCode(user.id, 'password_reset');
    await emailService.sendPasswordResetEmail(user.email, code, user.firstName);

    return true;
  }

  async resetPassword(code: string, newPassword: string): Promise<boolean> {
    // Find the code first to get the user
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        code,
        type: 'password_reset',
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationCode) {
      throw new BadRequestError(
        'Invalid or expired reset code',
        ErrorCodes.AUTH_INVALID_CREDENTIALS
      );
    }

    // Verify the code
    const result = await verificationService.verifyCode(
      verificationCode.userId,
      code,
      'password_reset'
    );

    if (!result.valid) {
      throw new BadRequestError(result.message, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: verificationCode.userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: verificationCode.userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });

    logger.info(`Password reset for user: ${verificationCode.userId}`);
    return true;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found', ErrorCodes.USER_NOT_FOUND);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError(
        'Current password is incorrect',
        ErrorCodes.AUTH_PASSWORD_MISMATCH
      );
    }

    // Check if new password is same as current
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestError(
        'New password must be different from current password',
        'SAME_PASSWORD'
      );
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info(`Password changed for user: ${userId}`);
    return true;
  }

  async validateCredentials(
    email: string,
    password: string
  ): Promise<{ userId: string; role: 'user' | 'admin' }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.emailVerified) {
      throw new UnauthorizedError(
        'Please verify your email before logging in',
        ErrorCodes.AUTH_EMAIL_NOT_VERIFIED
      );
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedError(
        'Your account has been suspended',
        ErrorCodes.AUTH_USER_SUSPENDED
      );
    }

    if (user.status === 'banned') {
      throw new UnauthorizedError(
        'Your account has been banned',
        ErrorCodes.AUTH_USER_BANNED
      );
    }

    if (user.status === 'deleted') {
      throw new UnauthorizedError('Account not found', ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    return { userId: user.id, role: user.role };
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        isJobSeeker: true,
        isEmployer: true,
        profilePhotoUrl: true,
      },
    });
  }
}

export const authService = new AuthService();
export default authService;
