import type { Request, Response, NextFunction } from 'express';
import * as gdprService from '../services/gdpr.service';
import { sendSuccess } from '../utils/response';
import { ValidationError, ErrorCodes } from '../utils/AppError';

class GdprController {
  /**
   * GET /gdpr/export - Export user data (GDPR data portability)
   */
  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const data = await gdprService.exportUserData(userId);

      // Set headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="gighub-data-export-${new Date().toISOString().split('T')[0]}.json"`
      );

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /gdpr/deletion-request - Request account deletion
   */
  async requestDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { reason } = req.body;

      const request = await gdprService.requestAccountDeletion(userId, reason);

      sendSuccess(res, {
        message: 'Hesap silme talebi alındı',
        deletionRequest: {
          id: request.id,
          scheduledFor: request.scheduledFor,
          status: request.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /gdpr/deletion-request - Cancel account deletion request
   */
  async cancelDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      await gdprService.cancelAccountDeletion(userId);

      sendSuccess(res, {
        message: 'Hesap silme talebi iptal edildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /gdpr/deletion-status - Get deletion request status
   */
  async getDeletionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const status = await gdprService.getDeletionStatus(userId);

      sendSuccess(res, {
        hasPendingDeletion: !!status,
        deletionRequest: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /gdpr/consent - Get user consent status
   */
  async getConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const consent = await gdprService.getUserConsent(userId);

      sendSuccess(res, { consent });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /gdpr/consent - Update user consent
   */
  async updateConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { marketing, analytics, thirdParty } = req.body;

      // Validate at least one consent is provided
      if (
        marketing === undefined &&
        analytics === undefined &&
        thirdParty === undefined
      ) {
        throw new ValidationError(
          'En az bir onay türü belirtilmeli',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Validate types
      if (marketing !== undefined && typeof marketing !== 'boolean') {
        throw new ValidationError(
          'marketing alanı boolean olmalı',
          ErrorCodes.VALIDATION_FAILED
        );
      }
      if (analytics !== undefined && typeof analytics !== 'boolean') {
        throw new ValidationError(
          'analytics alanı boolean olmalı',
          ErrorCodes.VALIDATION_FAILED
        );
      }
      if (thirdParty !== undefined && typeof thirdParty !== 'boolean') {
        throw new ValidationError(
          'thirdParty alanı boolean olmalı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      await gdprService.updateUserConsent(userId, {
        marketing,
        analytics,
        thirdParty,
      });

      sendSuccess(res, {
        message: 'Onay tercihleri güncellendi',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const gdprController = new GdprController();
export default gdprController;
