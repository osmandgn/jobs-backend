import { prisma } from '../config/database';
import { ReviewType, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ErrorCodes,
} from '../utils/AppError';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import { CACHE_TTL } from '../utils/cacheTTL';
import { containsProfanity } from '../utils/profanityFilter';
import logger from '../utils/logger';
import type { CreateReviewInput, GetReviewsQuery } from '../validators/review.validator';

// Default review window days
const DEFAULT_REVIEW_WINDOW_DAYS = 14;

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  averagePunctuality: number | null;
  averageQuality: number | null;
  averageCommunication: number | null;
}

export interface ReviewListItem {
  id: string;
  rating: number;
  punctualityRating: number | null;
  qualityRating: number | null;
  communicationRating: number | null;
  comment: string | null;
  reviewType: ReviewType;
  createdAt: Date;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  job: {
    id: string;
    title: string;
  };
}

export interface PendingReviewJob {
  id: string;
  title: string;
  jobDate: Date | null;
  completedAt: Date | null;
  otherParty: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  reviewType: ReviewType;
}

class ReviewService {
  /**
   * Get review window days from system settings
   */
  private async getReviewWindowDays(): Promise<number> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'review_window_days' },
      });
      return setting ? parseInt(setting.value, 10) : DEFAULT_REVIEW_WINDOW_DAYS;
    } catch {
      return DEFAULT_REVIEW_WINDOW_DAYS;
    }
  }

  /**
   * Check if user can review for a specific job
   */
  async checkReviewEligibility(
    userId: string,
    jobId: string
  ): Promise<{
    eligible: boolean;
    reason?: string;
    revieweeId?: string;
    reviewType?: ReviewType;
  }> {
    // Get the job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        userId: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!job) {
      return { eligible: false, reason: 'İş bulunamadı' };
    }

    // Job must be completed
    if (job.status !== 'completed') {
      return { eligible: false, reason: 'İş henüz tamamlanmamış' };
    }

    const isEmployer = job.userId === userId;

    // Find accepted application for this job
    const acceptedApplication = await prisma.application.findFirst({
      where: {
        jobId,
        status: 'accepted',
      },
      select: {
        applicantId: true,
      },
    });

    if (!acceptedApplication) {
      return { eligible: false, reason: 'Kabul edilen başvuru bulunamadı' };
    }

    const isWorker = acceptedApplication.applicantId === userId;

    // User must be either employer or accepted worker
    if (!isEmployer && !isWorker) {
      return { eligible: false, reason: 'Bu işi değerlendirme yetkiniz yok' };
    }

    // Determine review direction
    let revieweeId: string;
    let reviewType: ReviewType;

    if (isEmployer) {
      // Employer reviewing worker
      revieweeId = acceptedApplication.applicantId;
      reviewType = 'employer_to_worker';
    } else {
      // Worker reviewing employer
      revieweeId = job.userId;
      reviewType = 'worker_to_employer';
    }

    // Check if already reviewed in this direction
    const existingReview = await prisma.review.findFirst({
      where: {
        jobId,
        reviewerId: userId,
        revieweeId,
      },
    });

    if (existingReview) {
      return { eligible: false, reason: 'Bu işi zaten değerlendirdiniz' };
    }

    // Check review window
    const reviewWindowDays = await this.getReviewWindowDays();
    const completedAt = job.updatedAt; // When status changed to completed
    const windowEnd = new Date(completedAt);
    windowEnd.setDate(windowEnd.getDate() + reviewWindowDays);

    if (new Date() > windowEnd) {
      return {
        eligible: false,
        reason: `Değerlendirme süresi dolmuş (${reviewWindowDays} gün)`,
      };
    }

    return {
      eligible: true,
      revieweeId,
      reviewType,
    };
  }

  /**
   * Create a new review
   */
  async createReview(
    userId: string,
    input: CreateReviewInput
  ): Promise<ReviewListItem> {
    const { jobId, rating, punctualityRating, qualityRating, communicationRating, comment } =
      input;

    // Check eligibility
    const eligibility = await this.checkReviewEligibility(userId, jobId);

    if (!eligibility.eligible) {
      throw new BadRequestError(
        eligibility.reason || 'Bu işi değerlendirme yetkiniz yok',
        ErrorCodes.REVIEW_NOT_ELIGIBLE
      );
    }

    // Check profanity in comment
    if (comment && containsProfanity(comment)) {
      throw new BadRequestError(
        'Yorumunuz uygunsuz içerik barındırıyor',
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        jobId,
        reviewerId: userId,
        revieweeId: eligibility.revieweeId!,
        rating,
        punctualityRating,
        qualityRating,
        communicationRating,
        comment,
        reviewType: eligibility.reviewType!,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Invalidate reviewee's stats cache
    await cacheService.del(cacheKeys.reviewStats(eligibility.revieweeId!));
    await cacheService.del(cacheKeys.userStats(eligibility.revieweeId!));

    logger.info(
      `Review created: ${review.id} by ${userId} for job ${jobId}, reviewee: ${eligibility.revieweeId}`
    );

    return {
      id: review.id,
      rating: review.rating,
      punctualityRating: review.punctualityRating,
      qualityRating: review.qualityRating,
      communicationRating: review.communicationRating,
      comment: review.comment,
      reviewType: review.reviewType,
      createdAt: review.createdAt,
      reviewer: review.reviewer,
      job: review.job,
    };
  }

  /**
   * Get user's received reviews
   */
  async getUserReviews(
    userId: string,
    query: GetReviewsQuery
  ): Promise<{
    reviews: ReviewListItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit } = query;

    const where: Prisma.ReviewWhereInput = {
      revieweeId: userId,
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        punctualityRating: review.punctualityRating,
        qualityRating: review.qualityRating,
        communicationRating: review.communicationRating,
        comment: review.comment,
        reviewType: review.reviewType,
        createdAt: review.createdAt,
        reviewer: review.reviewer,
        job: review.job,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user's review statistics
   */
  async getUserReviewStats(userId: string): Promise<ReviewStats> {
    // Try cache first
    const cached = await cacheService.get<ReviewStats>(cacheKeys.reviewStats(userId));
    if (cached) return cached;

    // Get all reviews for user
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      select: {
        rating: true,
        punctualityRating: true,
        qualityRating: true,
        communicationRating: true,
      },
    });

    if (reviews.length === 0) {
      const emptyStats: ReviewStats = {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        averagePunctuality: null,
        averageQuality: null,
        averageCommunication: null,
      };
      return emptyStats;
    }

    // Calculate stats
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    // Rating breakdown
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingBreakdown[r.rating as keyof typeof ratingBreakdown]++;
    });

    // Sub-ratings averages
    const punctualityRatings = reviews
      .filter((r) => r.punctualityRating !== null)
      .map((r) => r.punctualityRating!);
    const qualityRatings = reviews
      .filter((r) => r.qualityRating !== null)
      .map((r) => r.qualityRating!);
    const communicationRatings = reviews
      .filter((r) => r.communicationRating !== null)
      .map((r) => r.communicationRating!);

    const averagePunctuality =
      punctualityRatings.length > 0
        ? Math.round(
            (punctualityRatings.reduce((a, b) => a + b, 0) / punctualityRatings.length) * 10
          ) / 10
        : null;

    const averageQuality =
      qualityRatings.length > 0
        ? Math.round(
            (qualityRatings.reduce((a, b) => a + b, 0) / qualityRatings.length) * 10
          ) / 10
        : null;

    const averageCommunication =
      communicationRatings.length > 0
        ? Math.round(
            (communicationRatings.reduce((a, b) => a + b, 0) / communicationRatings.length) * 10
          ) / 10
        : null;

    const stats: ReviewStats = {
      averageRating,
      totalReviews: reviews.length,
      ratingBreakdown,
      averagePunctuality,
      averageQuality,
      averageCommunication,
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKeys.reviewStats(userId), stats, CACHE_TTL.REVIEW_STATS);

    return stats;
  }

  /**
   * Get pending reviews for user
   * Jobs where user participated, completed, and not yet reviewed
   */
  async getPendingReviews(userId: string): Promise<PendingReviewJob[]> {
    const reviewWindowDays = await this.getReviewWindowDays();
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - reviewWindowDays);

    // Find completed jobs where user is employer or accepted applicant
    // and review window hasn't expired

    // Jobs where user is employer
    const employerJobs = await prisma.job.findMany({
      where: {
        userId,
        status: 'completed',
        updatedAt: { gte: windowStart },
      },
      include: {
        applications: {
          where: { status: 'accepted' },
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
              },
            },
          },
          take: 1,
        },
        reviews: {
          where: { reviewerId: userId },
        },
      },
    });

    // Jobs where user is accepted worker
    const workerApplications = await prisma.application.findMany({
      where: {
        applicantId: userId,
        status: 'accepted',
        job: {
          status: 'completed',
          updatedAt: { gte: windowStart },
        },
      },
      include: {
        job: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
              },
            },
            reviews: {
              where: { reviewerId: userId },
            },
          },
        },
      },
    });

    const pendingReviews: PendingReviewJob[] = [];

    // Process employer jobs
    for (const job of employerJobs) {
      const acceptedApp = job.applications[0];
      if (!acceptedApp) continue;

      // Check if already reviewed
      const hasReviewed = job.reviews.some(
        (r) => r.revieweeId === acceptedApp.applicantId
      );
      if (hasReviewed) continue;

      pendingReviews.push({
        id: job.id,
        title: job.title,
        jobDate: job.jobDate,
        completedAt: job.updatedAt,
        otherParty: acceptedApp.applicant,
        reviewType: 'employer_to_worker',
      });
    }

    // Process worker applications
    for (const app of workerApplications) {
      // Check if already reviewed
      const hasReviewed = app.job.reviews.some(
        (r) => r.revieweeId === app.job.userId
      );
      if (hasReviewed) continue;

      pendingReviews.push({
        id: app.job.id,
        title: app.job.title,
        jobDate: app.job.jobDate,
        completedAt: app.job.updatedAt,
        otherParty: app.job.user,
        reviewType: 'worker_to_employer',
      });
    }

    // Sort by completion date, most recent first
    pendingReviews.sort((a, b) => {
      const dateA = a.completedAt?.getTime() || 0;
      const dateB = b.completedAt?.getTime() || 0;
      return dateB - dateA;
    });

    return pendingReviews;
  }

  /**
   * Report a review (flag for admin)
   */
  async reportReview(
    userId: string,
    reviewId: string,
    reason: string
  ): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, reviewerId: true, revieweeId: true },
    });

    if (!review) {
      throw new NotFoundError('Değerlendirme bulunamadı', ErrorCodes.NOT_FOUND);
    }

    // User must be the reviewee (the one who received the review)
    if (review.revieweeId !== userId) {
      throw new ForbiddenError(
        'Sadece size yapılan değerlendirmeleri raporlayabilirsiniz',
        ErrorCodes.FORBIDDEN
      );
    }

    // Check if already reported this review
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        description: { contains: `review:${reviewId}` },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existingReport) {
      throw new BadRequestError(
        'Bu değerlendirmeyi zaten raporladınız',
        ErrorCodes.REPORT_DUPLICATE
      );
    }

    // Create report
    await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: review.reviewerId,
        reason: 'inappropriate',
        description: `review:${reviewId} - ${reason}`,
        status: 'pending',
      },
    });

    logger.info(`Review ${reviewId} reported by ${userId}`);
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewListItem | null> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!review) return null;

    return {
      id: review.id,
      rating: review.rating,
      punctualityRating: review.punctualityRating,
      qualityRating: review.qualityRating,
      communicationRating: review.communicationRating,
      comment: review.comment,
      reviewType: review.reviewType,
      createdAt: review.createdAt,
      reviewer: review.reviewer,
      job: review.job,
    };
  }
}

export const reviewService = new ReviewService();
export default reviewService;
