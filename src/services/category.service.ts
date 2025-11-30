import { Category, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { cacheService } from './cache.service';
import { cacheKeys, cachePatterns } from '../utils/cacheKeys';
import { CACHE_TTL } from '../utils/cacheTTL';
import { slugify, generateUniqueSlug } from '../utils/slugify';
import { NotFoundError, BadRequestError, ErrorCodes } from '../utils/AppError';

// Types
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  jobCount?: number;
  children: CategoryTreeNode[];
}

export interface CategoryWithParent extends Category {
  parent: Category | null;
  children: Category[];
}

export interface PopularCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  jobCount: number;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  icon?: string | null;
  description?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ReorderCategoryInput {
  id: string;
  sortOrder: number;
}

class CategoryService {
  /**
   * Get all active categories as a tree structure
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    return cacheService.getOrSet(
      cacheKeys.categoryTree(),
      async () => {
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        // Get job counts for each category
        const jobCounts = await prisma.job.groupBy({
          by: ['categoryId'],
          where: { status: 'active' },
          _count: { id: true },
        });

        const jobCountMap = new Map(jobCounts.map((jc) => [jc.categoryId, jc._count.id]));

        return this.buildTree(categories, null, jobCountMap);
      },
      CACHE_TTL.CATEGORIES
    );
  }

  /**
   * Build tree structure from flat category array
   */
  private buildTree(
    categories: Category[],
    parentId: string | null,
    jobCountMap: Map<string, number>
  ): CategoryTreeNode[] {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        jobCount: jobCountMap.get(cat.id) || 0,
        children: this.buildTree(categories, cat.id, jobCountMap),
      }));
  }

  /**
   * Get all active categories (flat list)
   */
  async getAllCategories(): Promise<Category[]> {
    return cacheService.getOrSet(
      cacheKeys.allCategories(),
      async () => {
        return prisma.category.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
      },
      CACHE_TTL.CATEGORIES
    );
  }

  /**
   * Get category by ID or slug
   */
  async getCategoryByIdOrSlug(idOrSlug: string): Promise<CategoryWithParent | null> {
    const cacheKey = idOrSlug.includes('-')
      ? cacheKeys.categoryBySlug(idOrSlug)
      : cacheKeys.categoryById(idOrSlug);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const category = await prisma.category.findFirst({
          where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
            isActive: true,
          },
          include: {
            parent: true,
            children: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
          },
        });

        return category;
      },
      CACHE_TTL.CATEGORIES
    );
  }

  /**
   * Get popular categories based on job count
   */
  async getPopularCategories(limit: number = 10): Promise<PopularCategory[]> {
    return cacheService.getOrSet(
      cacheKeys.popularCategories(),
      async () => {
        const categoriesWithJobs = await prisma.category.findMany({
          where: {
            isActive: true,
            parentId: null, // Only parent categories
          },
          include: {
            _count: {
              select: {
                jobs: {
                  where: { status: 'active' },
                },
              },
            },
          },
          orderBy: {
            jobs: {
              _count: 'desc',
            },
          },
          take: limit,
        });

        return categoriesWithJobs.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          jobCount: cat._count.jobs,
        }));
      },
      CACHE_TTL.POPULAR_CATEGORIES
    );
  }

  /**
   * Get subcategories of a parent category
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        parentId,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Check if category with slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.category.findFirst({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!existing;
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get all categories for admin (including inactive)
   */
  async getAllCategoriesAdmin(): Promise<Category[]> {
    return prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get category by ID for admin (including inactive)
   */
  async getCategoryByIdAdmin(id: string): Promise<CategoryWithParent | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
  }

  /**
   * Create a new category (Admin)
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    // Generate slug if not provided
    const slug = input.slug
      ? slugify(input.slug)
      : await generateUniqueSlug(input.name, (s) => this.slugExists(s));

    // Check if slug already exists
    if (input.slug && (await this.slugExists(slug))) {
      throw new BadRequestError('Bu slug zaten kullanımda', ErrorCodes.VALIDATION_FAILED);
    }

    // Validate parent exists if provided
    if (input.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundError('Üst kategori bulunamadı', ErrorCodes.NOT_FOUND);
      }
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        icon: input.icon,
        description: input.description,
        parentId: input.parentId,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return category;
  }

  /**
   * Update a category (Admin)
   */
  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    // Handle slug update
    let slug = existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      slug = slugify(input.slug);
      if (await this.slugExists(slug, id)) {
        throw new BadRequestError('Bu slug zaten kullanımda', ErrorCodes.VALIDATION_FAILED);
      }
    } else if (input.name && input.name !== existing.name && !input.slug) {
      // Auto-update slug if name changes and slug not explicitly set
      slug = await generateUniqueSlug(input.name, (s) => this.slugExists(s, id));
    }

    // Validate parent if changing
    if (input.parentId !== undefined && input.parentId !== existing.parentId) {
      if (input.parentId) {
        // Can't set parent to self
        if (input.parentId === id) {
          throw new BadRequestError(
            'Kategori kendisinin üst kategorisi olamaz',
            ErrorCodes.VALIDATION_FAILED
          );
        }
        // Check parent exists
        const parent = await prisma.category.findUnique({
          where: { id: input.parentId },
        });
        if (!parent) {
          throw new NotFoundError('Üst kategori bulunamadı', ErrorCodes.NOT_FOUND);
        }
        // Prevent circular reference
        const isDescendant = await this.isDescendant(input.parentId, id);
        if (isDescendant) {
          throw new BadRequestError(
            'Döngüsel referans oluşturulamaz',
            ErrorCodes.VALIDATION_FAILED
          );
        }
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        slug,
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return category;
  }

  /**
   * Check if categoryId is a descendant of potentialAncestorId
   */
  private async isDescendant(categoryId: string, potentialAncestorId: string): Promise<boolean> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    if (!category || !category.parentId) {
      return false;
    }

    if (category.parentId === potentialAncestorId) {
      return true;
    }

    return this.isDescendant(category.parentId, potentialAncestorId);
  }

  /**
   * Delete a category (Admin)
   */
  async deleteCategory(id: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobs: true,
            children: true,
            skills: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    // Check if category has jobs
    if (category._count.jobs > 0) {
      throw new BadRequestError(
        `Bu kategoride ${category._count.jobs} iş ilanı bulunuyor. Önce ilanları taşıyın veya silin.`,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Check if category has children
    if (category._count.children > 0) {
      throw new BadRequestError(
        `Bu kategorinin ${category._count.children} alt kategorisi bulunuyor. Önce alt kategorileri silin.`,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Check if category has skills
    if (category._count.skills > 0) {
      throw new BadRequestError(
        `Bu kategoride ${category._count.skills} beceri tanımlı. Önce becerileri silin veya taşıyın.`,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateCache();
  }

  /**
   * Reorder categories (Admin)
   */
  async reorderCategories(items: ReorderCategoryInput[]): Promise<void> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    // Invalidate cache
    await this.invalidateCache();
  }

  /**
   * Soft delete - deactivate category (Admin)
   */
  async deactivateCategory(id: string): Promise<Category> {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate cache
    await this.invalidateCache();

    return updated;
  }

  /**
   * Activate category (Admin)
   */
  async activateCategory(id: string): Promise<Category> {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: true },
    });

    // Invalidate cache
    await this.invalidateCache();

    return updated;
  }

  /**
   * Invalidate all category caches
   */
  private async invalidateCache(): Promise<void> {
    await cacheService.invalidatePattern(cachePatterns.allCategoryKeys());
    // Also invalidate skills cache as they depend on categories
    await cacheService.invalidatePattern(cachePatterns.allSkillKeys());
  }
}

export const categoryService = new CategoryService();
export default categoryService;
