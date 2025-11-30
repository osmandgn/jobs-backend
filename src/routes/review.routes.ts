import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All review routes require authentication

/**
 * POST /api/v1/reviews
 * Create a new review
 */
router.post('/', authMiddleware, reviewController.createReview);

/**
 * GET /api/v1/reviews/pending
 * Get pending reviews for current user
 */
router.get('/pending', authMiddleware, reviewController.getPendingReviews);

/**
 * GET /api/v1/reviews/:id
 * Get a single review by ID (public)
 */
router.get('/:id', reviewController.getReview);

/**
 * POST /api/v1/reviews/:id/report
 * Report a review
 */
router.post('/:id/report', authMiddleware, reviewController.reportReview);

export default router;
