import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';

const router = Router();

// Public routes
router.get('/', categoryController.getCategoryTree.bind(categoryController));
router.get('/flat', categoryController.getAllCategories.bind(categoryController));
router.get('/popular', categoryController.getPopularCategories.bind(categoryController));
router.get('/:idOrSlug', categoryController.getCategoryByIdOrSlug.bind(categoryController));
router.get(
  '/:idOrSlug/subcategories',
  categoryController.getSubcategories.bind(categoryController)
);

export default router;
