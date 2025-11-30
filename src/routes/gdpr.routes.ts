import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { gdprController } from '../controllers/gdpr.controller';

const router = Router();

// All GDPR routes require authentication
router.use(authMiddleware);

/**
 * GET /gdpr/export - Export user data (GDPR data portability)
 * Returns all user data as JSON download
 */
router.get('/export', gdprController.exportData.bind(gdprController));

/**
 * GET /gdpr/consent - Get user consent status
 */
router.get('/consent', gdprController.getConsent.bind(gdprController));

/**
 * PUT /gdpr/consent - Update user consent preferences
 * @body marketing - boolean - Marketing communication consent
 * @body analytics - boolean - Analytics tracking consent
 * @body thirdParty - boolean - Third party sharing consent
 */
router.put('/consent', gdprController.updateConsent.bind(gdprController));

/**
 * GET /gdpr/deletion-status - Get account deletion request status
 */
router.get('/deletion-status', gdprController.getDeletionStatus.bind(gdprController));

/**
 * POST /gdpr/deletion-request - Request account deletion
 * @body reason - string (optional) - Reason for deletion
 */
router.post('/deletion-request', gdprController.requestDeletion.bind(gdprController));

/**
 * DELETE /gdpr/deletion-request - Cancel account deletion request
 */
router.delete('/deletion-request', gdprController.cancelDeletion.bind(gdprController));

export default router;
