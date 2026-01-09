import { Router, Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

/**
 * GET /api/v1/settings/public
 * Get public settings for mobile app (no auth required)
 */
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get only public settings that mobile app needs
    const settings = await settingsService.getSettings([
      'max_images_per_job',
      'job_expiry_days',
      'min_pay_amount',
      'max_pay_amount',
      'maintenance_mode',
      'maintenance_message',
    ]);

    sendSuccess(res, {
      maxImagesPerJob: settings.max_images_per_job || 5,
      jobExpiryDays: settings.job_expiry_days || 30,
      minPayAmount: settings.min_pay_amount || 10,
      maxPayAmount: settings.max_pay_amount || 10000,
      maintenanceMode: settings.maintenance_mode || false,
      maintenanceMessage: settings.maintenance_message || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
