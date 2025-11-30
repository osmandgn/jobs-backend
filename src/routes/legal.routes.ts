import { Router } from 'express';
import { legalController } from '../controllers/legal.controller';

const router = Router();

// Public routes - no authentication required

/**
 * GET /legal/versions - Get all document versions
 */
router.get('/versions', legalController.getAllVersions.bind(legalController));

/**
 * GET /legal/:type - Get a legal document
 * @param type - Document type: terms, privacy, guidelines, safety, cookies
 */
router.get('/:type', legalController.getDocument.bind(legalController));

/**
 * GET /legal/:type/version - Get document version info
 * @param type - Document type: terms, privacy, guidelines, safety, cookies
 */
router.get('/:type/version', legalController.getDocumentVersion.bind(legalController));

export default router;
