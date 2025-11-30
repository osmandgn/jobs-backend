import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/applications
 * @desc    Get my applications (as job seeker)
 * @access  Private
 * @query   status - Filter by status (pending, accepted, rejected, withdrawn)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 50)
 */
router.get('/', applicationController.getMyApplications.bind(applicationController));

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single application detail
 * @access  Private (applicant or job owner)
 */
router.get('/:id', applicationController.getApplication.bind(applicationController));

/**
 * @route   PATCH /api/v1/applications/:id
 * @desc    Update application status (employer accepts/rejects)
 * @access  Private (job owner only)
 * @body    { status: 'accepted' | 'rejected' }
 */
router.patch('/:id', applicationController.updateApplicationStatus.bind(applicationController));

/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Withdraw application (applicant)
 * @access  Private (applicant only)
 */
router.delete('/:id', applicationController.withdrawApplication.bind(applicationController));

export default router;
