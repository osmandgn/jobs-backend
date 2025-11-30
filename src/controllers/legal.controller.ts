import type { Request, Response, NextFunction } from 'express';
import * as legalService from '../services/legal.service';
import type { LegalDocumentType } from '../services/legal.service';
import { sendSuccess } from '../utils/response';
import { ValidationError, ErrorCodes } from '../utils/AppError';

const VALID_DOCUMENT_TYPES: LegalDocumentType[] = [
  'terms',
  'privacy',
  'guidelines',
  'safety',
  'cookies',
];

class LegalController {
  /**
   * GET /legal/:type - Get a legal document
   */
  async getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type } = req.params;

      if (!type || !VALID_DOCUMENT_TYPES.includes(type as LegalDocumentType)) {
        throw new ValidationError(
          `Geçersiz belge türü. Geçerli türler: ${VALID_DOCUMENT_TYPES.join(', ')}`,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const document = await legalService.getDocument(type as LegalDocumentType);

      sendSuccess(res, document);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /legal/:type/version - Get document version info
   */
  async getDocumentVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type } = req.params;

      if (!type || !VALID_DOCUMENT_TYPES.includes(type as LegalDocumentType)) {
        throw new ValidationError(
          `Geçersiz belge türü. Geçerli türler: ${VALID_DOCUMENT_TYPES.join(', ')}`,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const version = await legalService.getDocumentVersion(type as LegalDocumentType);

      sendSuccess(res, version);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /legal/versions - Get all document versions
   */
  async getAllVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const versions = await legalService.getAllDocumentVersions();

      sendSuccess(res, { documents: versions });
    } catch (error) {
      next(error);
    }
  }
}

export const legalController = new LegalController();
export default legalController;
