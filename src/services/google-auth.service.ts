import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/AppError';
import logger from '../utils/logger';

interface GoogleUserInfo {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(config.google?.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.google?.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new AppError(
          'Invalid Google ID token',
          401,
          ErrorCodes.AUTH_TOKEN_INVALID
        );
      }

      if (!payload.sub || !payload.email) {
        throw new AppError(
          'Google token missing required fields',
          400,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified || false,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Google token verification failed:', error);
      throw new AppError(
        'Invalid Google ID token',
        401,
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }
  }

  async findOrCreateUser(googleInfo: GoogleUserInfo): Promise<{
    user: { id: string; email: string; role: 'user' | 'admin' };
    isNewUser: boolean;
  }> {
    // Try to find existing user by Google ID
    let user = await prisma.user.findFirst({
      where: { googleId: googleInfo.googleId },
    });

    if (user) {
      // Update last login time and profile photo if available
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (googleInfo.picture && !user.profilePhotoUrl) {
        updateData.profilePhotoUrl = googleInfo.picture;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return {
        user: { id: user.id, email: user.email, role: user.role as 'user' | 'admin' },
        isNewUser: false,
      };
    }

    // Try to find user by email
    user = await prisma.user.findUnique({
      where: { email: googleInfo.email.toLowerCase() },
    });

    if (user) {
      // Link Google ID to existing account
      const updateData: Record<string, unknown> = { googleId: googleInfo.googleId };
      if (googleInfo.picture && !user.profilePhotoUrl) {
        updateData.profilePhotoUrl = googleInfo.picture;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return {
        user: { id: user.id, email: user.email, role: user.role as 'user' | 'admin' },
        isNewUser: false,
      };
    }

    // Create new user
    const bcrypt = await import('bcrypt');
    const randomPassword = require('crypto').randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        email: googleInfo.email.toLowerCase(),
        passwordHash,
        firstName: googleInfo.firstName || 'Google',
        lastName: googleInfo.lastName || 'User',
        googleId: googleInfo.googleId,
        profilePhotoUrl: googleInfo.picture,
        emailVerified: googleInfo.emailVerified,
        status: 'active',
        role: 'user',
        notificationPrefs: {
          create: {},
        },
      },
    });

    logger.info(`New user registered via Google Sign In: ${newUser.id}`);

    return {
      user: { id: newUser.id, email: newUser.email, role: 'user' },
      isNewUser: true,
    };
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
