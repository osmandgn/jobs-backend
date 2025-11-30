import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../../services/admin.service';
import { sendSuccess } from '../../utils/response';

class DashboardController {
  /**
   * GET /admin/dashboard - Get dashboard statistics
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();

      sendSuccess(res, { stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/activity - Get recent activity feed
   */
  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const activities = await adminService.getRecentActivity(limit);

      sendSuccess(res, { activities });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
export default dashboardController;
