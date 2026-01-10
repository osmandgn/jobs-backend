import type { Request, Response, NextFunction } from 'express';
import * as settingsService from '../../services/settings.service';
import * as adminLogService from '../../services/adminLog.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, NotFoundError, ErrorCodes } from '../../utils/AppError';

class AdminSettingsController {
  /**
   * GET /admin/settings - Get all system settings
   */
  async getAllSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await settingsService.getAllSettings();

      // Return both array format (for detailed view) and object format (for easy access)
      const settingsArray = Object.values(settings).map((setting) => ({
        key: setting.key,
        value: setting.value,
        rawValue: setting.rawValue,
        description: setting.description,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
      }));

      // Also create key-value object for easier frontend consumption
      const settingsObject: Record<string, any> = {};
      for (const setting of settingsArray) {
        settingsObject[setting.key] = setting.value;
      }

      sendSuccess(res, { settings: settingsArray, ...settingsObject });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/settings/:key - Get a single setting
   */
  async getSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;

      const setting = await settingsService.getSettingDetail(key!);

      if (!setting) {
        throw new NotFoundError(`Ayar bulunamadı: ${key}`, ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, setting);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/settings/:key - Update a setting
   */
  async updateSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const adminId = req.user!.userId;

      if (value === undefined || value === null) {
        throw new ValidationError('Değer belirtilmeli', ErrorCodes.VALIDATION_FAILED);
      }

      // Convert value to string for storage
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      const setting = await settingsService.updateSetting(key!, stringValue, adminId);

      // Log the action
      await adminLogService.logAction({
        adminId,
        action: 'setting_update',
        targetType: 'setting',
        targetId: key!,
        details: { newValue: stringValue },
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        message: 'Ayar güncellendi',
        setting,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/settings/reload - Reload settings cache
   */
  async reloadSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;

      await settingsService.reloadSettings();

      // Log the action
      await adminLogService.logAction({
        adminId,
        action: 'setting_update',
        targetType: 'system',
        targetId: 'settings_cache',
        details: { action: 'reload' },
        ipAddress: req.ip,
      });

      sendSuccess(res, { message: 'Ayarlar önbelleği yenilendi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/settings/initialize - Initialize default settings
   */
  async initializeSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;

      await settingsService.initializeDefaultSettings();

      // Log the action
      await adminLogService.logAction({
        adminId,
        action: 'setting_update',
        targetType: 'system',
        targetId: 'settings_init',
        details: { action: 'initialize_defaults' },
        ipAddress: req.ip,
      });

      sendSuccess(res, { message: 'Varsayılan ayarlar başlatıldı' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/settings/maintenance - Get maintenance status
   */
  async getMaintenanceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isActive = await settingsService.isMaintenanceMode();
      const message = await settingsService.getMaintenanceMessage();

      sendSuccess(res, {
        maintenanceMode: isActive,
        message: isActive ? message : null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/settings/maintenance - Toggle maintenance mode
   */
  async toggleMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enabled, message } = req.body;
      const adminId = req.user!.userId;

      if (typeof enabled !== 'boolean') {
        throw new ValidationError(
          'enabled alanı boolean olmalı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Update maintenance mode
      await settingsService.updateSetting('maintenance_mode', String(enabled), adminId);

      // Update message if provided
      if (message !== undefined) {
        await settingsService.updateSetting('maintenance_message', message, adminId);
      }

      // Log the action
      await adminLogService.logAction({
        adminId,
        action: 'setting_update',
        targetType: 'system',
        targetId: 'maintenance_mode',
        details: { enabled, message },
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        message: enabled ? 'Bakım modu etkinleştirildi' : 'Bakım modu devre dışı bırakıldı',
        maintenanceMode: enabled,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminSettingsController = new AdminSettingsController();
export default adminSettingsController;
