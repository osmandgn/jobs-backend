import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, ErrorCodes } from '../utils/AppError';

/**
 * Admin authorization middleware
 * Must be used after authMiddleware
 * Checks if the authenticated user has admin role
 */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(
      new ForbiddenError('Authentication required', ErrorCodes.FORBIDDEN)
    );
  }

  if (req.user.role !== 'admin') {
    return next(
      new ForbiddenError(
        'Admin access required',
        ErrorCodes.FORBIDDEN
      )
    );
  }

  next();
}

/**
 * Role-based authorization middleware factory
 * Allows specifying which roles are allowed
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new ForbiddenError('Authentication required', ErrorCodes.FORBIDDEN)
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role: ${roles.join(' or ')}`,
          ErrorCodes.FORBIDDEN
        )
      );
    }

    next();
  };
}

export default requireAdmin;
