import type { Request, Response, NextFunction } from 'express';
import * as deviceService from '../services/device.service';
import { registerDeviceSchema, updateTokenSchema, removeDeviceSchema } from '../validators/device.validator';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { BadRequestError, ValidationError, ErrorCodes } from '../utils/AppError';
import { DevicePlatform } from '@prisma/client';

class DeviceController {
  /**
   * POST /devices - Register device token
   */
  async registerDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const validationResult = registerDeviceSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Geçersiz cihaz verisi', ErrorCodes.VALIDATION_FAILED, {
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { token, platform, deviceName } = validationResult.data;

      await deviceService.registerDevice({
        userId,
        token,
        platform: platform as DevicePlatform,
        deviceName,
      });

      sendCreated(res, { message: 'Cihaz başarıyla kaydedildi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /devices - Remove device token
   */
  async removeDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = removeDeviceSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Geçersiz token verisi', ErrorCodes.VALIDATION_FAILED, {
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { token } = validationResult.data;

      await deviceService.removeDevice(token);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /devices/all - Remove all user devices
   */
  async removeAllDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const count = await deviceService.removeAllUserDevices(userId);

      sendSuccess(res, { removedCount: count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /devices/token - Update device token
   */
  async updateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = updateTokenSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Geçersiz token verisi', ErrorCodes.VALIDATION_FAILED, {
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { oldToken, newToken } = validationResult.data;

      const updated = await deviceService.updateDeviceToken({ oldToken, newToken });

      if (!updated) {
        throw new BadRequestError('Cihaz bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, { message: 'Token başarıyla güncellendi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /devices - Get user's devices
   */
  async getMyDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const devices = await deviceService.getUserDevices(userId);

      // Mask tokens for security
      const maskedDevices = devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        deviceName: device.deviceName,
        lastUsedAt: device.lastUsedAt,
        createdAt: device.createdAt,
        tokenPreview: device.token.substring(0, 20) + '...',
      }));

      sendSuccess(res, { devices: maskedDevices });
    } catch (error) {
      next(error);
    }
  }
}

export const deviceController = new DeviceController();
export default deviceController;
