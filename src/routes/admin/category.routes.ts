import { Router } from 'express';
import { categoryController } from '../../controllers/category.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/role.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Admin category routes
router.get('/', categoryController.getAllCategoriesAdmin.bind(categoryController));
router.get('/:id', categoryController.getCategoryByIdAdmin.bind(categoryController));
router.post('/', categoryController.createCategory.bind(categoryController));
router.put('/reorder', categoryController.reorderCategories.bind(categoryController));
router.put('/:id', categoryController.updateCategory.bind(categoryController));
router.delete('/:id', categoryController.deleteCategory.bind(categoryController));
router.patch('/:id/deactivate', categoryController.deactivateCategory.bind(categoryController));
router.patch('/:id/activate', categoryController.activateCategory.bind(categoryController));

export default router;
