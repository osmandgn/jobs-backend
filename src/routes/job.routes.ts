import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { applicationController } from '../controllers/application.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { applicationLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ==================== Public Routes ====================

// Search and filter jobs (must be before /:id to avoid conflict)
router.get('/', optionalAuthMiddleware, jobController.searchJobs.bind(jobController));

// Get nearby jobs
router.get('/nearby', optionalAuthMiddleware, jobController.getNearbyJobs.bind(jobController));

// ==================== Protected Routes ====================

// Create job
router.post('/', authMiddleware, jobController.createJob.bind(jobController));

// Get my jobs (must be before /:id)
router.get('/mine', authMiddleware, jobController.getMyJobs.bind(jobController));

// ==================== Public/Optional Auth Routes ====================

// Get job details (optionalAuth for isSaved check)
router.get('/:id', optionalAuthMiddleware, jobController.getJob.bind(jobController));

// Update job
router.put('/:id', authMiddleware, jobController.updateJob.bind(jobController));

// Delete job
router.delete('/:id', authMiddleware, jobController.deleteJob.bind(jobController));

// Update job status
router.patch('/:id/status', authMiddleware, jobController.updateJobStatus.bind(jobController));

// Save job
router.post('/:id/save', authMiddleware, jobController.saveJob.bind(jobController));

// Unsave job
router.delete('/:id/save', authMiddleware, jobController.unsaveJob.bind(jobController));

// ==================== Application Routes ====================

// Apply to a job
router.post(
  '/:id/apply',
  authMiddleware,
  applicationLimiter,
  applicationController.applyToJob.bind(applicationController)
);

// Get applications for a job (employer view)
router.get(
  '/:id/applications',
  authMiddleware,
  applicationController.getJobApplications.bind(applicationController)
);

export default router;
