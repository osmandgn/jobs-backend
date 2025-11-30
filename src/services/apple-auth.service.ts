import * as jose from 'jose';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/AppError';
import logger from '../utils/logger';

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  auth_time: number;
}

interface AppleUserInfo {
  appleId: string;
  email?: string;
  emailVerified: boolean;
}

interface AppleJWKSet {
  keys: jose.JWK[];
}

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

class AppleAuthService {
  private cachedKeys: jose.JWK[] | null = null;
  private keysExpiry: number = 0;

  private async getApplePublicKeys(): Promise<jose.JWK[]> {
    const now = Date.now();

    // Use cached keys if still valid (cache for 1 hour)
    if (this.cachedKeys && this.keysExpiry > now) {
      return this.cachedKeys;
    }

    try {
      const response = await fetch(APPLE_KEYS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch Apple public keys: ${response.status}`);
      }

      const data = (await response.json()) as AppleJWKSet;
      this.cachedKeys = data.keys;
      this.keysExpiry = now + 60 * 60 * 1000; // 1 hour cache

      if (!this.cachedKeys) {
        throw new Error('No keys returned from Apple');
      }

      return this.cachedKeys;
    } catch (error) {
      logger.error('Failed to fetch Apple public keys:', error);
      throw new AppError(
        'Failed to verify Apple credentials',
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }
  }

  async verifyIdentityToken(identityToken: string): Promise<AppleUserInfo> {
    try {
      const keys = await this.getApplePublicKeys();
      const JWKS = jose.createLocalJWKSet({ keys });

      const { payload } = await jose.jwtVerify(identityToken, JWKS, {
        issuer: APPLE_ISSUER,
        audience: config.apple?.bundleId || 'com.gighub.app',
      });

      const applePayload = payload as unknown as AppleTokenPayload;

      // Validate required fields
      if (!applePayload.sub) {
        throw new AppError(
          'Invalid Apple identity token: missing subject',
          400,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      return {
        appleId: applePayload.sub,
        email: applePayload.email,
        emailVerified:
          applePayload.email_verified === true ||
          applePayload.email_verified === 'true',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Apple token verification failed:', error);
      throw new AppError(
        'Invalid Apple identity token',
        401,
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }
  }

  async findOrCreateUser(
    appleInfo: AppleUserInfo,
    firstName?: string,
    lastName?: string
  ): Promise<{
    user: { id: string; email: string; role: 'user' | 'admin' };
    isNewUser: boolean;
  }> {
    // Try to find existing user by Apple ID
    let user = await prisma.user.findFirst({
      where: { appleId: appleInfo.appleId },
    });

    if (user) {
      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });

      return {
        user: { id: user.id, email: user.email, role: user.role as 'user' | 'admin' },
        isNewUser: false,
      };
    }

    // Try to find user by email if Apple provides it
    if (appleInfo.email) {
      user = await prisma.user.findUnique({
        where: { email: appleInfo.email.toLowerCase() },
      });

      if (user) {
        // Link Apple ID to existing account
        await prisma.user.update({
          where: { id: user.id },
          data: { appleId: appleInfo.appleId },
        });

        return {
          user: { id: user.id, email: user.email, role: user.role as 'user' | 'admin' },
          isNewUser: false,
        };
      }
    }

    // Create new user
    const email = appleInfo.email?.toLowerCase();

    if (!email) {
      throw new AppError(
        'Email is required for registration. Please share your email with the app.',
        400,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Generate a random secure password (user won't use it directly)
    const bcrypt = await import('bcrypt');
    const randomPassword = require('crypto').randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || 'Apple',
        lastName: lastName || 'User',
        appleId: appleInfo.appleId,
        emailVerified: appleInfo.emailVerified,
        status: 'active',
        role: 'user',
        notificationPrefs: {
          create: {},
        },
      },
    });

    logger.info(`New user registered via Apple Sign In: ${newUser.id}`);

    return {
      user: { id: newUser.id, email: newUser.email, role: 'user' },
      isNewUser: true,
    };
  }
}

export const appleAuthService = new AppleAuthService();
export default appleAuthService;
