import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../../services/admin.service';
import { sendSuccess } from '../../utils/response';
import { NotFoundError, ErrorCodes } from '../../utils/AppError';

class AdminApplicationController {
  /**
   * GET /admin/applications - List applications with filters and pagination
   */
  async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
      };

      const result = await adminService.getApplications(filters, page, limit, sortBy, sortOrder);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/applications/:id - Get application details
   */
  async getApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applicationId = req.params.id!;

      const application = await adminService.getApplicationById(applicationId);

      if (!application) {
        throw new NotFoundError('Başvuru bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, application);
    } catch (error) {
      next(error);
    }
  }
}

export const adminApplicationController = new AdminApplicationController();
export default adminApplicationController;
