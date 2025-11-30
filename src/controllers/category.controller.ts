import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError, ErrorCodes } from '../utils/AppError';
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from '../validators/category.validator';

class CategoryController {
  /**
   * GET /api/v1/categories
   * Get all categories as tree structure
   */
  async getCategoryTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await categoryService.getCategoryTree();
      sendSuccess(res, tree, 'Kategoriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/categories/flat
   * Get all categories as flat list
   */
  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.getAllCategories();
      sendSuccess(res, categories, 'Kategoriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/categories/popular
   * Get popular categories
   */
  async getPopularCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const categories = await categoryService.getPopularCategories(limit);
      sendSuccess(res, categories, 'Popüler kategoriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/categories/:idOrSlug
   * Get category by ID or slug
   */
  async getCategoryByIdOrSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idOrSlug } = req.params;
      if (!idOrSlug) {
        throw new BadRequestError('Kategori ID veya slug gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      const category = await categoryService.getCategoryByIdOrSlug(idOrSlug);

      if (!category) {
        throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, category, 'Kategori başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/categories/:idOrSlug/subcategories
   * Get subcategories of a category
   */
  async getSubcategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idOrSlug } = req.params;
      if (!idOrSlug) {
        throw new BadRequestError('Kategori ID veya slug gereklidir', ErrorCodes.VALIDATION_FAILED);
      }

      // First get the category to get its ID
      const category = await categoryService.getCategoryByIdOrSlug(idOrSlug);
      if (!category) {
        throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
      }

      const subcategories = await categoryService.getSubcategories(category.id);
      sendSuccess(res, subcategories, 'Alt kategoriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN METHODS ====================

  /**
   * GET /api/v1/admin/categories
   * Get all categories for admin (including inactive)
   */
  async getAllCategoriesAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.getAllCategoriesAdmin();
      sendSuccess(res, categories, 'Kategoriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/categories/:id
   * Get category by ID for admin
   */
  async getCategoryByIdAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Kategori ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      const category = await categoryService.getCategoryByIdAdmin(id);

      if (!category) {
        throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, category, 'Kategori başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/categories
   * Create a new category
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createCategorySchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const category = await categoryService.createCategory(validation.data);
      sendSuccess(res, category, 'Kategori başarıyla oluşturuldu', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/categories/:id
   * Update a category
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Kategori ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }

      const validation = updateCategorySchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const category = await categoryService.updateCategory(id, validation.data);
      sendSuccess(res, category, 'Kategori başarıyla güncellendi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/categories/:id
   * Delete a category
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Kategori ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      await categoryService.deleteCategory(id);
      sendSuccess(res, null, 'Kategori başarıyla silindi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/categories/reorder
   * Reorder categories
   */
  async reorderCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = reorderCategoriesSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      await categoryService.reorderCategories(validation.data.items);
      sendSuccess(res, null, 'Kategoriler başarıyla yeniden sıralandı');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/categories/:id/deactivate
   * Deactivate a category
   */
  async deactivateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Kategori ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      const category = await categoryService.deactivateCategory(id);
      sendSuccess(res, category, 'Kategori başarıyla deaktif edildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/categories/:id/activate
   * Activate a category
   */
  async activateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Kategori ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      const category = await categoryService.activateCategory(id);
      sendSuccess(res, category, 'Kategori başarıyla aktif edildi');
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
export default categoryController;
