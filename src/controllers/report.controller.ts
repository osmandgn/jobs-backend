import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { blockService } from '../services/block.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { NotFoundError, ErrorCodes } from '../utils/AppError';
import {
  createReportSchema,
  getReportsQuerySchema,
  blockUserSchema,
  userIdParamSchema,
  getBlockedUsersQuerySchema,
} from '../validators/report.validator';

class ReportController {
  /**
   * POST /reports
   * Create a report for user or job
   */
  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input = createReportSchema.parse(req.body);

      const result = await reportService.createReport(userId, input);

      sendCreated(res, result, 'Raporunuz başarıyla oluşturuldu');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/mine
   * Get reports submitted by current user
   */
  async getMyReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const query = getReportsQuerySchema.parse(req.query);

      const result = await reportService.getMyReports(userId, query);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/:id
   * Get a single report
   */
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;

      const report = await reportService.getReportById(userId, id);

      if (!report) {
        throw new NotFoundError('Rapor bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/:id/block
   * Block a user
   */
  async blockUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blockerId = req.user!.userId;
      const { id: blockedId } = userIdParamSchema.parse(req.params);
      const input = blockUserSchema.parse(req.body);

      await blockService.blockUser(blockerId, blockedId, input);

      sendCreated(res, { blockedId }, 'Kullanıcı engellendi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /users/:id/block
   * Unblock a user
   */
  async unblockUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blockerId = req.user!.userId;
      const { id: blockedId } = userIdParamSchema.parse(req.params);

      await blockService.unblockUser(blockerId, blockedId);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/blocked
   * Get list of blocked users
   */
  async getBlockedUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const query = getBlockedUsersQuerySchema.parse(req.query);

      const result = await blockService.getBlockedUsers(userId, query);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/:id/block-status
   * Check if user is blocked (either direction)
   */
  async getBlockStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id: targetId } = userIdParamSchema.parse(req.params);

      const [isBlocked, isBlockedBy] = await Promise.all([
        blockService.isBlocked(userId, targetId),
        blockService.isBlocked(targetId, userId),
      ]);

      sendSuccess(res, {
        isBlocked,
        isBlockedBy,
        hasBlockRelation: isBlocked || isBlockedBy,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
export default reportController;
