import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import {
  createReviewSchema,
  getReviewsQuerySchema,
  userIdParamSchema,
  reviewIdParamSchema,
  reportReviewSchema,
} from '../validators/review.validator';
import { sendSuccess, sendCreated } from '../utils/response';
import { ValidationError, NotFoundError, ErrorCodes } from '../utils/AppError';

class ReviewController {
  /**
   * POST /api/v1/reviews
   * Create a new review
   */
  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationResult = createReviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError('Geçersiz değerlendirme verisi', 'VALIDATION_ERROR', {
          errors: validationResult.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.userId;
      const review = await reviewService.createReview(userId, validationResult.data);

      sendCreated(res, review, 'Değerlendirme başarıyla oluşturuldu');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/:id/reviews
   * Get reviews for a user (public)
   */
  async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramResult = userIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        throw new ValidationError('Geçersiz kullanıcı ID', 'VALIDATION_ERROR');
      }

      const queryResult = getReviewsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        throw new ValidationError('Geçersiz sorgu parametreleri', 'VALIDATION_ERROR', {
          errors: queryResult.error.flatten().fieldErrors,
        });
      }

      const result = await reviewService.getUserReviews(
        paramResult.data.id,
        queryResult.data
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/:id/review-stats
   * Get review statistics for a user (public)
   */
  async getUserReviewStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramResult = userIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        throw new ValidationError('Geçersiz kullanıcı ID', 'VALIDATION_ERROR');
      }

      const stats = await reviewService.getUserReviewStats(paramResult.data.id);

      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reviews/pending
   * Get pending reviews for current user
   */
  async getPendingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const pendingReviews = await reviewService.getPendingReviews(userId);

      sendSuccess(res, { reviews: pendingReviews });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/reviews/:id/report
   * Report a review for admin review
   */
  async reportReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramResult = reviewIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        throw new ValidationError('Geçersiz değerlendirme ID', 'VALIDATION_ERROR');
      }

      const bodyResult = reportReviewSchema.safeParse(req.body);
      if (!bodyResult.success) {
        throw new ValidationError('Geçersiz rapor verisi', 'VALIDATION_ERROR', {
          errors: bodyResult.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.userId;
      await reviewService.reportReview(userId, paramResult.data.id, bodyResult.data.reason);

      sendSuccess(res, null, 'Değerlendirme raporlandı');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reviews/:id
   * Get a single review by ID
   */
  async getReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramResult = reviewIdParamSchema.safeParse(req.params);
      if (!paramResult.success) {
        throw new ValidationError('Geçersiz değerlendirme ID', 'VALIDATION_ERROR');
      }

      const review = await reviewService.getReviewById(paramResult.data.id);

      if (!review) {
        throw new NotFoundError('Değerlendirme bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, review);
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
export default reviewController;
