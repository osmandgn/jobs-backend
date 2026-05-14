import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

const BYPASS_PATHS = [
  '/health',
  '/admin',
  '/settings/public',
  '/app/version',
  '/auth/login',
];

export const maintenanceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isEnabled = await settingsService.isMaintenanceMode();

    if (!isEnabled) {
      return next();
    }

    const path = req.path;
    if (BYPASS_PATHS.some((bp) => path.startsWith(bp))) {
      return next();
    }

    const message = await settingsService.getMaintenanceMessage();

    sendError(
      res,
      'MAINTENANCE_MODE',
      message || 'We are currently performing maintenance. Please check back soon.',
      503
    );
  } catch (error) {
    logger.error('Maintenance middleware error:', error);
    next();
  }
};
