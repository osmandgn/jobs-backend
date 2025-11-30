import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../../services/admin.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, ErrorCodes } from '../../utils/AppError';

class AdminReportController {
  /**
   * GET /admin/reports - List reports with filters and pagination
   */
  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filters = {
        status: req.query.status as string,
        type: req.query.type as 'user' | 'job' | undefined,
        reason: req.query.reason as string,
      };

      const result = await adminService.getReports(filters, page, limit, sortBy, sortOrder);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/reports/:id - Get report full details
   */
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = req.params.id!;
      const adminId = req.user!.userId;

      const result = await adminService.getReportById(adminId, reportId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /admin/reports/:id - Update report (status, adminNotes)
   */
  async updateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = req.params.id!;
      const adminId = req.user!.userId;
      const { status, adminNotes } = req.body;

      if (!status && adminNotes === undefined) {
        throw new ValidationError(
          'En az bir alan güncellenmeli: status veya adminNotes',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Validate status if provided
      if (status) {
        const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
          throw new ValidationError(
            `Geçersiz durum. Geçerli değerler: ${validStatuses.join(', ')}`,
            ErrorCodes.VALIDATION_FAILED
          );
        }
      }

      await adminService.updateReport(adminId, reportId, { status, adminNotes }, req.ip);

      sendSuccess(res, { message: 'Rapor güncellendi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/reports/:id/action - Take action on a report
   */
  async takeAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportId = req.params.id!;
      const adminId = req.user!.userId;
      const { action, reason } = req.body;

      if (!action) {
        throw new ValidationError('Aksiyon belirtilmeli', ErrorCodes.VALIDATION_FAILED);
      }

      const validActions = ['warn', 'suspend', 'ban', 'remove_job', 'dismiss'];
      if (!validActions.includes(action)) {
        throw new ValidationError(
          `Geçersiz aksiyon. Geçerli değerler: ${validActions.join(', ')}`,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      await adminService.takeReportAction(
        adminId,
        reportId,
        action as 'warn' | 'suspend' | 'ban' | 'remove_job' | 'dismiss',
        reason,
        req.ip
      );

      sendSuccess(res, { message: 'Aksiyon uygulandı' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/reports/bulk-resolve - Bulk resolve reports
   */
  async bulkResolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { reportIds, status } = req.body;

      if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
        throw new ValidationError(
          'En az bir rapor ID\'si gerekli',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      if (reportIds.length > 50) {
        throw new ValidationError(
          'Maksimum 50 rapor toplu çözümlenebilir',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      if (!status || !['resolved', 'dismissed'].includes(status)) {
        throw new ValidationError(
          'Geçerli durum belirtilmeli: resolved veya dismissed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const result = await adminService.bulkResolveReports(adminId, reportIds, status, req.ip);

      sendSuccess(res, {
        message: `${result.resolved} rapor çözümlendi, ${result.failed} rapor başarısız`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminReportController = new AdminReportController();
export default adminReportController;
