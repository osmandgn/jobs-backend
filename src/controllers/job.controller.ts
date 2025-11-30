import { Request, Response, NextFunction } from 'express';
import { jobService } from '../services/job.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { BadRequestError, ErrorCodes } from '../utils/AppError';
import {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  jobIdSchema,
  getMyJobsQuerySchema,
  jobSearchQuerySchema,
  nearbyJobsQuerySchema,
} from '../validators/job.validator';
import { JobStatus } from '@prisma/client';

class JobController {
  /**
   * POST /api/v1/jobs
   * Create a new job
   */
  async createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const validatedData = createJobSchema.parse(req.body);
      const job = await jobService.createJob(userId, validatedData);

      sendCreated(res, job, 'İş ilanı başarıyla oluşturuldu');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/:id
   * Get job details
   */
  async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = jobIdSchema.parse(req.params);
      const viewerId = req.user?.userId;

      const job = await jobService.getJobById(id, viewerId, { incrementViews: true });

      sendSuccess(res, job);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/jobs/:id
   * Update a job
   */
  async updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = jobIdSchema.parse(req.params);
      const validatedData = updateJobSchema.parse(req.body);

      const job = await jobService.updateJob(id, userId, validatedData);

      sendSuccess(res, job, 'İş ilanı başarıyla güncellendi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/jobs/:id
   * Delete a job
   */
  async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = jobIdSchema.parse(req.params);

      await jobService.deleteJob(id, userId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/mine
   * Get current user's jobs
   */
  async getMyJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const query = getMyJobsQuerySchema.parse(req.query);
      const result = await jobService.getMyJobs(userId, query);

      sendPaginated(res, result.jobs, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/jobs/:id/status
   * Update job status
   */
  async updateJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = jobIdSchema.parse(req.params);
      const { status } = updateJobStatusSchema.parse(req.body);

      const job = await jobService.updateJobStatus(id, userId, status as JobStatus);

      sendSuccess(res, job, 'İş ilanı durumu güncellendi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/jobs/:id/save
   * Save a job
   */
  async saveJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = jobIdSchema.parse(req.params);

      await jobService.saveJob(id, userId);

      sendSuccess(res, { saved: true }, 'İş ilanı kaydedildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/jobs/:id/save
   * Unsave a job
   */
  async unsaveJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = jobIdSchema.parse(req.params);

      await jobService.unsaveJob(id, userId);

      sendSuccess(res, { saved: false }, 'İş ilanı kaydedilenlerden çıkarıldı');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/me/saved-jobs
   * Get user's saved jobs
   */
  async getSavedJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await jobService.getSavedJobs(userId, page, limit);

      sendPaginated(res, result.jobs, {
        page: result.page,
        limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs
   * Search and filter jobs
   */
  async searchJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const viewerId = req.user?.userId;
      const query = jobSearchQuerySchema.parse(req.query);

      const result = await jobService.searchJobs(query, viewerId);

      sendPaginated(res, result.jobs, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/nearby
   * Get nearby jobs by location
   */
  async getNearbyJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = nearbyJobsQuerySchema.parse(req.query);

      // Validate that at least postcode OR (lat & lng) is provided
      if (!query.postcode && (query.lat === undefined || query.lng === undefined)) {
        throw new BadRequestError(
          'Konum bilgisi gerekli. Postcode veya koordinatlar (lat, lng) belirtin.',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const result = await jobService.getNearbyJobs(query);

      sendPaginated(res, result.jobs, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobController = new JobController();
export default jobController;
