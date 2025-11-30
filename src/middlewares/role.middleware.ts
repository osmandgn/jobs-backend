import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError, ErrorCodes } from '../utils/AppError';

type Role = 'user' | 'admin';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new UnauthorizedError('Authentication required', ErrorCodes.AUTH_TOKEN_INVALID)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          'You do not have permission to access this resource',
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireUser = requireRole('user', 'admin');

export default requireRole;
