import { Skill } from '@prisma/client';
import prisma from '../config/database';
import { cacheService } from './cache.service';
import { cacheKeys, cachePatterns } from '../utils/cacheKeys';
import { CACHE_TTL } from '../utils/cacheTTL';
import { slugify, generateUniqueSlug } from '../utils/slugify';
import { NotFoundError, BadRequestError, ErrorCodes } from '../utils/AppError';

// Types
export interface SkillWithCategory extends Skill {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SkillsByCategory {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  skills: SkillInfo[];
}

export interface SkillInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CreateSkillInput {
  name: string;
  slug?: string;
  categoryId: string;
}

export interface UpdateSkillInput {
  name?: string;
  slug?: string;
  categoryId?: string;
}

class SkillService {
  /**
   * Get all skills
   */
  async getAllSkills(): Promise<SkillWithCategory[]> {
    return cacheService.getOrSet(
      cacheKeys.allSkills(),
      async () => {
        return prisma.skill.findMany({
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        });
      },
      CACHE_TTL.SKILLS
    );
  }

  /**
   * Get all skills grouped by category
   */
  async getSkillsGroupedByCategory(): Promise<SkillsByCategory[]> {
    const skills = await this.getAllSkills();

    const grouped = new Map<string, SkillsByCategory>();

    for (const skill of skills) {
      const categoryId = skill.categoryId;

      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, {
          categoryId,
          categoryName: skill.category.name,
          categorySlug: skill.category.slug,
          skills: [],
        });
      }

      grouped.get(categoryId)!.skills.push({
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
      });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName)
    );
  }

  /**
   * Get skills by category ID
   */
  async getSkillsByCategory(categoryId: string): Promise<SkillInfo[]> {
    return cacheService.getOrSet(
      cacheKeys.skillsByCategory(categoryId),
      async () => {
        const skills = await prisma.skill.findMany({
          where: { categoryId },
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: { name: 'asc' },
        });

        return skills;
      },
      CACHE_TTL.SKILLS
    );
  }

  /**
   * Get skills by IDs (for validation)
   */
  async getSkillsByIds(ids: string[]): Promise<Skill[]> {
    if (ids.length === 0) return [];

    return prisma.skill.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  /**
   * Validate skill IDs exist
   */
  async validateSkillIds(ids: string[]): Promise<{ valid: boolean; invalidIds: string[] }> {
    if (ids.length === 0) return { valid: true, invalidIds: [] };

    const existingSkills = await prisma.skill.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const existingIds = new Set(existingSkills.map((s) => s.id));
    const invalidIds = ids.filter((id) => !existingIds.has(id));

    return {
      valid: invalidIds.length === 0,
      invalidIds,
    };
  }

  /**
   * Get skill by ID
   */
  async getSkillById(id: string): Promise<SkillWithCategory | null> {
    return prisma.skill.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Get skill by slug
   */
  async getSkillBySlug(slug: string): Promise<SkillWithCategory | null> {
    return prisma.skill.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Check if skill with slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.skill.findFirst({
      where: {
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!existing;
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Get all skills for admin
   */
  async getAllSkillsAdmin(): Promise<SkillWithCategory[]> {
    return prisma.skill.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  /**
   * Create a new skill (Admin)
   */
  async createSkill(input: CreateSkillInput): Promise<Skill> {
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    // Generate slug if not provided
    const slug = input.slug
      ? slugify(input.slug)
      : await generateUniqueSlug(input.name, (s) => this.slugExists(s));

    // Check if slug already exists
    if (input.slug && (await this.slugExists(slug))) {
      throw new BadRequestError('Bu slug zaten kullanımda', ErrorCodes.VALIDATION_FAILED);
    }

    const skill = await prisma.skill.create({
      data: {
        name: input.name,
        slug,
        categoryId: input.categoryId,
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return skill;
  }

  /**
   * Update a skill (Admin)
   */
  async updateSkill(id: string, input: UpdateSkillInput): Promise<Skill> {
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Beceri bulunamadı', ErrorCodes.NOT_FOUND);
    }

    // Validate category if changing
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });

      if (!category) {
        throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
      }
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

    const skill = await prisma.skill.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        slug,
        ...(input.categoryId && { categoryId: input.categoryId }),
      },
    });

    // Invalidate cache
    await this.invalidateCache();

    return skill;
  }

  /**
   * Delete a skill (Admin)
   */
  async deleteSkill(id: string): Promise<void> {
    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userSkills: true,
            jobRequiredSkills: true,
          },
        },
      },
    });

    if (!skill) {
      throw new NotFoundError('Beceri bulunamadı', ErrorCodes.NOT_FOUND);
    }

    // Check if skill is used by users
    if (skill._count.userSkills > 0) {
      throw new BadRequestError(
        `Bu beceri ${skill._count.userSkills} kullanıcı tarafından kullanılıyor. Önce kullanıcılardan kaldırın.`,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Check if skill is used by jobs
    if (skill._count.jobRequiredSkills > 0) {
      throw new BadRequestError(
        `Bu beceri ${skill._count.jobRequiredSkills} iş ilanında kullanılıyor. Önce ilanlardan kaldırın.`,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    await prisma.skill.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateCache();
  }

  /**
   * Bulk create skills for a category (Admin)
   */
  async bulkCreateSkills(
    categoryId: string,
    skillNames: string[]
  ): Promise<{ created: number; skipped: string[] }> {
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundError('Kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    const skipped: string[] = [];
    const toCreate: { name: string; slug: string; categoryId: string }[] = [];

    for (const name of skillNames) {
      const slug = await generateUniqueSlug(name, (s) => this.slugExists(s));
      const existsWithName = await prisma.skill.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          categoryId,
        },
      });

      if (existsWithName) {
        skipped.push(name);
      } else {
        toCreate.push({ name, slug, categoryId });
      }
    }

    if (toCreate.length > 0) {
      await prisma.skill.createMany({
        data: toCreate,
      });
    }

    // Invalidate cache
    await this.invalidateCache();

    return {
      created: toCreate.length,
      skipped,
    };
  }

  /**
   * Move skills to another category (Admin)
   */
  async moveSkillsToCategory(skillIds: string[], targetCategoryId: string): Promise<number> {
    // Validate target category exists
    const category = await prisma.category.findUnique({
      where: { id: targetCategoryId },
    });

    if (!category) {
      throw new NotFoundError('Hedef kategori bulunamadı', ErrorCodes.NOT_FOUND);
    }

    const result = await prisma.skill.updateMany({
      where: { id: { in: skillIds } },
      data: { categoryId: targetCategoryId },
    });

    // Invalidate cache
    await this.invalidateCache();

    return result.count;
  }

  /**
   * Invalidate all skill caches
   */
  private async invalidateCache(): Promise<void> {
    await cacheService.invalidatePattern(cachePatterns.allSkillKeys());
  }
}

export const skillService = new SkillService();
export default skillService;
