import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import type {
  UpdateProfileInput,
  UpdateSettingsInput,
  ToggleActivelyLookingInput,
  UpdateNotificationRadiusInput,
} from '../validators/user.validator';
import { AppError, ErrorCodes } from '../utils/AppError';

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const profile = await userService.getProfile(userId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as UpdateProfileInput;
      const profile = await userService.updateProfile(userId, data);
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const viewerId = req.user?.userId;

      if (!id) {
        throw new AppError('User ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      const profile = await userService.getPublicProfile(id, viewerId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as UpdateSettingsInput;
      const profile = await userService.updateSettings(userId, data);
      sendSuccess(res, profile, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleActivelyLooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { isActivelyLooking } = req.body as ToggleActivelyLookingInput;
      const profile = await userService.toggleActivelyLooking(userId, isActivelyLooking);
      sendSuccess(res, profile, `Actively looking ${isActivelyLooking ? 'enabled' : 'disabled'}`);
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationRadius(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { radiusMiles } = req.body as UpdateNotificationRadiusInput;
      const profile = await userService.updateNotificationRadius(userId, radiusMiles);
      sendSuccess(res, profile, `Notification radius updated to ${radiusMiles} miles`);
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      // Check if user wants hard delete
      const hard = req.query.hard === 'true';

      await userService.deleteAccount(userId, hard);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
export default userController;
