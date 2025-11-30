import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { jobController } from '../controllers/job.controller';
import { reviewController } from '../controllers/review.controller';
import { reportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate';
import {
  updateProfileSchema,
  updateSettingsSchema,
  toggleActivelyLookingSchema,
  updateNotificationRadiusSchema,
} from '../validators/user.validator';

const router = Router();

// Protected routes - require authentication
router.get(
  '/me',
  authMiddleware,
  userController.getProfile.bind(userController)
);

router.put(
  '/me',
  authMiddleware,
  validateBody(updateProfileSchema),
  userController.updateProfile.bind(userController)
);

router.put(
  '/me/settings',
  authMiddleware,
  validateBody(updateSettingsSchema),
  userController.updateSettings.bind(userController)
);

router.patch(
  '/me/actively-looking',
  authMiddleware,
  validateBody(toggleActivelyLookingSchema),
  userController.toggleActivelyLooking.bind(userController)
);

router.patch(
  '/me/notification-radius',
  authMiddleware,
  validateBody(updateNotificationRadiusSchema),
  userController.updateNotificationRadius.bind(userController)
);

router.delete(
  '/me',
  authMiddleware,
  userController.deleteAccount.bind(userController)
);

// Saved jobs
router.get(
  '/me/saved-jobs',
  authMiddleware,
  jobController.getSavedJobs.bind(jobController)
);

// Blocked users list
router.get('/blocked', authMiddleware, reportController.getBlockedUsers);

// Public profile - optional auth for block checking
router.get(
  '/:id',
  optionalAuthMiddleware,
  userController.getPublicProfile.bind(userController)
);

// User reviews (public)
router.get('/:id/reviews', reviewController.getUserReviews);

// User review stats (public)
router.get('/:id/review-stats', reviewController.getUserReviewStats);

// Block/unblock user
router.post('/:id/block', authMiddleware, reportController.blockUser);
router.delete('/:id/block', authMiddleware, reportController.unblockUser);

// Check block status
router.get('/:id/block-status', authMiddleware, reportController.getBlockStatus);

export default router;
