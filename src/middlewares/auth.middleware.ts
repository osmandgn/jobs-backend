import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { tokenService } from '../services/token.service';
import { UnauthorizedError, ErrorCodes } from '../utils/AppError';

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(
        'No token provided',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError(
        'No token provided',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenService.isAccessTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError(
        'Token has been revoked',
        ErrorCodes.AUTH_TOKEN_INVALID
      );
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth middleware - extracts user from token if present,
 * but doesn't require authentication. Useful for public endpoints
 * that need to know if a user is logged in (e.g., for block checking).
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenService.isAccessTokenBlacklisted(token);
    if (isBlacklisted) {
      return next();
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    // Token invalid, but that's ok - continue without user
    next();
  }
}

export default authMiddleware;
