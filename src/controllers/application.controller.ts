import { Request, Response, NextFunction } from 'express';
import { applicationService } from '../services/application.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { BadRequestError, ErrorCodes } from '../utils/AppError';
import {
  applyToJobSchema,
  updateApplicationStatusSchema,
  applicationIdSchema,
  getApplicationsQuerySchema,
} from '../validators/application.validator';
import { jobIdSchema } from '../validators/job.validator';
import { ApplicationStatus } from '@prisma/client';

class ApplicationController {
  /**
   * POST /api/v1/jobs/:id/apply
   * Apply to a job
   */
  async applyToJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id: jobId } = jobIdSchema.parse(req.params);
      const validatedData = applyToJobSchema.parse(req.body);

      const application = await applicationService.applyToJob(jobId, userId, validatedData);

      sendCreated(res, application, 'Başvurunuz başarıyla gönderildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications
   * Get my applications (as job seeker)
   */
  async getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const query = getApplicationsQuerySchema.parse(req.query);
      const result = await applicationService.getMyApplications(userId, query);

      sendPaginated(res, result.applications, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:id
   * Get single application
   */
  async getApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = applicationIdSchema.parse(req.params);
      const application = await applicationService.getApplicationById(id, userId);

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/:id/applications
   * Get job applications (as employer)
   */
  async getJobApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id: jobId } = jobIdSchema.parse(req.params);
      const query = getApplicationsQuerySchema.parse(req.query);

      const result = await applicationService.getJobApplications(jobId, userId, query);

      sendPaginated(res, result.applications, {
        page: result.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/applications/:id
   * Update application status (employer accepts/rejects)
   */
  async updateApplicationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = applicationIdSchema.parse(req.params);
      const { status } = updateApplicationStatusSchema.parse(req.body);

      const application = await applicationService.updateApplicationStatus(
        id,
        userId,
        status as 'accepted' | 'rejected'
      );

      sendSuccess(
        res,
        application,
        status === 'accepted' ? 'Başvuru kabul edildi' : 'Başvuru reddedildi'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/applications/:id
   * Withdraw application (applicant)
   */
  async withdrawApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('Kullanıcı bulunamadı', ErrorCodes.AUTH_TOKEN_INVALID);
      }

      const { id } = applicationIdSchema.parse(req.params);

      await applicationService.withdrawApplication(id, userId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const applicationController = new ApplicationController();
export default applicationController;
