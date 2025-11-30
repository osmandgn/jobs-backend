import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Report routes
router.post('/', reportController.createReport);
router.get('/mine', reportController.getMyReports);
router.get('/:id', reportController.getReport);

export default router;
