import type { Request, Response, NextFunction } from 'express';
import * as adminLogService from '../../services/adminLog.service';
import { sendSuccess } from '../../utils/response';

class AdminLogsController {
  /**
   * GET /admin/logs - Get admin activity logs
   */
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const filters: {
        adminId?: string;
        action?: adminLogService.AdminActionType;
        targetType?: adminLogService.TargetType;
        targetId?: string;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (req.query.adminId) {
        filters.adminId = req.query.adminId as string;
      }

      if (req.query.action) {
        filters.action = req.query.action as adminLogService.AdminActionType;
      }

      if (req.query.targetType) {
        filters.targetType = req.query.targetType as adminLogService.TargetType;
      }

      if (req.query.targetId) {
        filters.targetId = req.query.targetId as string;
      }

      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await adminLogService.getAdminLogs(filters, page, limit);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const adminLogsController = new AdminLogsController();
export default adminLogsController;
