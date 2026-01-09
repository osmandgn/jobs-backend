import { Router, Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { sendSuccess } from '../utils/response';

const router = Router();

/**
 * @swagger
 * /app/version:
 *   get:
 *     summary: Check app version requirements
 *     tags: [App]
 *     parameters:
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ios, android]
 *         description: The platform of the app
 *       - in: query
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Current app version (e.g., 1.0.0)
 *     responses:
 *       200:
 *         description: Version check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     updateRequired:
 *                       type: boolean
 *                     minVersion:
 *                       type: string
 *                     currentVersion:
 *                       type: string
 *                     message:
 *                       type: string
 *                     storeUrl:
 *                       type: string
 */
router.get('/version', async (req: Request, res: Response) => {
  const { platform, version } = req.query;

  // Validate inputs
  if (!platform || !version) {
    return sendSuccess(res, {
      updateRequired: false,
      message: 'Missing platform or version parameter',
    });
  }

  const platformStr = String(platform).toLowerCase();
  const currentVersion = String(version);

  // Get settings based on platform
  const minVersionKey = platformStr === 'ios' ? 'min_app_version_ios' : 'min_app_version_android';
  const storeUrlKey = platformStr === 'ios' ? 'app_store_url' : 'play_store_url';

  try {
    const [minVersion, storeUrl, forceUpdateMessage] = await Promise.all([
      settingsService.getSetting<string>(minVersionKey),
      settingsService.getSetting<string>(storeUrlKey),
      settingsService.getSetting<string>('force_update_message'),
    ]);

    // Compare versions
    const updateRequired = compareVersions(currentVersion, minVersion) < 0;

    return sendSuccess(res, {
      updateRequired,
      minVersion,
      currentVersion,
      message: updateRequired ? forceUpdateMessage : null,
      storeUrl: updateRequired ? storeUrl : null,
    });
  } catch (error) {
    // If settings fail, don't block the app
    return sendSuccess(res, {
      updateRequired: false,
      message: 'Version check unavailable',
    });
  }
});

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
}

export default router;
