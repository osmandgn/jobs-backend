import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../../services/admin.service';
import { sendSuccess, sendNoContent } from '../../utils/response';
import { ValidationError, ErrorCodes } from '../../utils/AppError';
import type { JobStatus } from '@prisma/client';

class AdminJobController {
  /**
   * GET /admin/jobs - List jobs with filters and pagination
   */
  async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        categoryId: req.query.categoryId as string,
        userId: req.query.userId as string,
      };

      const result = await adminService.getJobs(filters, page, limit, sortBy, sortOrder);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/jobs/:id - Get job full details
   */
  async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.id!;
      const adminId = req.user!.userId;

      const result = await adminService.getJobById(adminId, jobId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /admin/jobs/:id - Update job (status, adminNotes)
   */
  async updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.id!;
      const adminId = req.user!.userId;
      const { status, adminNotes } = req.body;

      if (!status && !adminNotes) {
        throw new ValidationError(
          'En az bir alan güncellenmeli: status veya adminNotes',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Validate status if provided
      if (status) {
        const validStatuses: JobStatus[] = [
          'draft',
          'pending_review',
          'active',
          'paused',
          'filled',
          'completed',
          'expired',
          'rejected',
        ];
        if (!validStatuses.includes(status)) {
          throw new ValidationError(
            `Geçersiz durum. Geçerli değerler: ${validStatuses.join(', ')}`,
            ErrorCodes.VALIDATION_FAILED
          );
        }
      }

      await adminService.updateJob(
        adminId,
        jobId,
        { status: status as JobStatus | undefined, adminNotes },
        req.ip
      );

      sendSuccess(res, { message: 'İş ilanı güncellendi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/jobs/:id/approve - Approve a pending job
   */
  async approveJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.id!;
      const adminId = req.user!.userId;

      await adminService.approveJob(adminId, jobId, req.ip);

      sendSuccess(res, { message: 'İş ilanı onaylandı' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/jobs/:id/reject - Reject a pending job
   */
  async rejectJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.id!;
      const adminId = req.user!.userId;
      const { reason } = req.body;

      if (!reason) {
        throw new ValidationError('Red sebebi belirtilmeli', ErrorCodes.VALIDATION_FAILED);
      }

      await adminService.rejectJob(adminId, jobId, reason, req.ip);

      sendSuccess(res, { message: 'İş ilanı reddedildi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /admin/jobs/:id - Delete a job
   */
  async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.id!;
      const adminId = req.user!.userId;
      const { reason } = req.body;

      if (!reason) {
        throw new ValidationError('Silme sebebi belirtilmeli', ErrorCodes.VALIDATION_FAILED);
      }

      await adminService.deleteJob(adminId, jobId, reason, req.ip);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/jobs/bulk-approve - Bulk approve pending jobs
   */
  async bulkApproveJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { jobIds } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        throw new ValidationError(
          'En az bir iş ilanı ID\'si gerekli',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      if (jobIds.length > 50) {
        throw new ValidationError(
          'Maksimum 50 ilan toplu onaylanabilir',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const result = await adminService.bulkApproveJobs(adminId, jobIds, req.ip);

      sendSuccess(res, {
        message: `${result.approved} ilan onaylandı, ${result.failed} ilan başarısız`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminJobController = new AdminJobController();
export default adminJobController;
