import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../../services/admin.service';
import * as adminLogService from '../../services/adminLog.service';
import { sendSuccess, sendNoContent } from '../../utils/response';
import { ValidationError, ErrorCodes } from '../../utils/AppError';
import type { UserStatus, UserRole } from '@prisma/client';

class AdminUserController {
  /**
   * GET /admin/users - List users with filters and pagination
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        role: req.query.role as string,
        isJobSeeker: req.query.isJobSeeker === 'true' ? true : req.query.isJobSeeker === 'false' ? false : undefined,
        isEmployer: req.query.isEmployer === 'true' ? true : req.query.isEmployer === 'false' ? false : undefined,
      };

      const result = await adminService.getUsers(filters, page, limit, sortBy, sortOrder);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/users/:id - Get user full details
   */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id!;
      const adminId = req.user!.userId;

      // Log the view
      await adminLogService.logAction({
        adminId,
        action: 'user_view',
        targetType: 'user',
        targetId: userId,
        ipAddress: req.ip,
      });

      const result = await adminService.getUserById(userId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /admin/users/:id - Update user (status, role)
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id!;
      const adminId = req.user!.userId;
      const { status, role } = req.body;

      if (!status && !role) {
        throw new ValidationError(
          'En az bir alan güncellenmeli: status veya role',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Validate status
      const validStatuses: UserStatus[] = ['active', 'suspended', 'banned'];
      if (status && !validStatuses.includes(status)) {
        throw new ValidationError(
          'Geçersiz durum: active, suspended veya banned olmalı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Validate role
      const validRoles: UserRole[] = ['user', 'admin'];
      if (role && !validRoles.includes(role)) {
        throw new ValidationError(
          'Geçersiz rol: user veya admin olmalı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      await adminService.updateUser(
        adminId,
        userId,
        { status: status as UserStatus | undefined, role: role as UserRole | undefined },
        req.ip
      );

      sendSuccess(res, { message: 'Kullanıcı güncellendi' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/users/:id/suspend - Suspend a user
   */
  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id!;
      const adminId = req.user!.userId;
      const { reason, durationDays } = req.body;

      if (!reason) {
        throw new ValidationError('Sebep belirtilmeli', ErrorCodes.VALIDATION_FAILED);
      }

      await adminService.suspendUser(adminId, userId, reason, durationDays, req.ip);

      sendSuccess(res, { message: 'Kullanıcı askıya alındı' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/users/:id/unsuspend - Remove suspension from user
   */
  async unsuspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id!;
      const adminId = req.user!.userId;

      await adminService.unsuspendUser(adminId, userId, req.ip);

      sendSuccess(res, { message: 'Kullanıcı askı durumu kaldırıldı' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/users/:id/ban - Ban a user
   */
  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id!;
      const adminId = req.user!.userId;
      const { reason } = req.body;

      if (!reason) {
        throw new ValidationError('Sebep belirtilmeli', ErrorCodes.VALIDATION_FAILED);
      }

      await adminService.banUser(adminId, userId, reason, req.ip);

      sendSuccess(res, { message: 'Kullanıcı yasaklandı' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /admin/users/:id - Delete a user
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id!;
      const adminId = req.user!.userId;
      const hardDelete = req.query.hard === 'true';

      await adminService.deleteUser(adminId, userId, hardDelete, req.ip);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const adminUserController = new AdminUserController();
export default adminUserController;
