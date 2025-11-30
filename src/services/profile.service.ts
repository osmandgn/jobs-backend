import { prisma } from '../config/database';
import { AppError, ErrorCodes } from '../utils/AppError';
import { cacheService } from './cache.service';
import { cacheKeys } from '../utils/cacheKeys';
import logger from '../utils/logger';

// ==================== Types ====================

interface AddSkillsInput {
  skillIds: string[];
}

interface AddCategoriesInput {
  categoryIds: string[];
}

interface CreateExperienceInput {
  title: string;
  company: string;
  description?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  isCurrent?: boolean;
}

interface UpdateExperienceInput {
  title?: string;
  company?: string;
  description?: string | null;
  startDate?: Date | string;
  endDate?: Date | string | null;
  isCurrent?: boolean;
}

interface CreatePortfolioInput {
  title: string;
  description?: string | null;
  imageUrl: string;
}

interface UpdatePortfolioInput {
  title?: string;
  description?: string | null;
  imageUrl?: string;
}

interface SkillResponse {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface ExperienceResponse {
  id: string;
  title: string;
  company: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
  createdAt: Date;
}

interface PortfolioResponse {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  createdAt: Date;
}

// ==================== Service ====================

class ProfileService {
  // ==================== Skills ====================

  async getUserSkills(userId: string): Promise<SkillResponse[]> {
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
            categoryId: true,
          },
        },
      },
    });

    return userSkills.map((us) => us.skill);
  }

  async addSkills(userId: string, data: AddSkillsInput): Promise<SkillResponse[]> {
    // Validate skills exist
    const skills = await prisma.skill.findMany({
      where: { id: { in: data.skillIds } },
    });

    if (skills.length !== data.skillIds.length) {
      throw new AppError('One or more skills not found', 400, ErrorCodes.VALIDATION_FAILED);
    }

    // Get existing user skills to avoid duplicates
    const existingSkills = await prisma.userSkill.findMany({
      where: { userId, skillId: { in: data.skillIds } },
    });

    const existingSkillIds = new Set(existingSkills.map((s) => s.skillId));
    const newSkillIds = data.skillIds.filter((id) => !existingSkillIds.has(id));

    if (newSkillIds.length > 0) {
      await prisma.userSkill.createMany({
        data: newSkillIds.map((skillId) => ({
          userId,
          skillId,
        })),
      });
    }

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Added ${newSkillIds.length} skills to user: ${userId}`);
    return this.getUserSkills(userId);
  }

  async removeSkill(userId: string, skillId: string): Promise<void> {
    const userSkill = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });

    if (!userSkill) {
      throw new AppError('Skill not found in user profile', 404, ErrorCodes.NOT_FOUND);
    }

    await prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Removed skill ${skillId} from user: ${userId}`);
  }

  async setSkills(userId: string, skillIds: string[]): Promise<SkillResponse[]> {
    // Validate skills exist
    if (skillIds.length > 0) {
      const skills = await prisma.skill.findMany({
        where: { id: { in: skillIds } },
      });

      if (skills.length !== skillIds.length) {
        throw new AppError('One or more skills not found', 400, ErrorCodes.VALIDATION_FAILED);
      }
    }

    // Delete all existing skills and add new ones in a transaction
    await prisma.$transaction([
      prisma.userSkill.deleteMany({ where: { userId } }),
      prisma.userSkill.createMany({
        data: skillIds.map((skillId) => ({ userId, skillId })),
      }),
    ]);

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Set ${skillIds.length} skills for user: ${userId}`);
    return this.getUserSkills(userId);
  }

  // ==================== Categories ====================

  async getUserCategories(userId: string): Promise<CategoryResponse[]> {
    const userCategories = await prisma.userCategory.findMany({
      where: { userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });

    return userCategories.map((uc) => uc.category);
  }

  async addCategories(userId: string, data: AddCategoriesInput): Promise<CategoryResponse[]> {
    // Validate categories exist and are active
    const categories = await prisma.category.findMany({
      where: { id: { in: data.categoryIds }, isActive: true },
    });

    if (categories.length !== data.categoryIds.length) {
      throw new AppError(
        'One or more categories not found or inactive',
        400,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Get existing user categories to avoid duplicates
    const existingCategories = await prisma.userCategory.findMany({
      where: { userId, categoryId: { in: data.categoryIds } },
    });

    const existingCategoryIds = new Set(existingCategories.map((c) => c.categoryId));
    const newCategoryIds = data.categoryIds.filter((id) => !existingCategoryIds.has(id));

    if (newCategoryIds.length > 0) {
      await prisma.userCategory.createMany({
        data: newCategoryIds.map((categoryId) => ({
          userId,
          categoryId,
        })),
      });
    }

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Added ${newCategoryIds.length} categories to user: ${userId}`);
    return this.getUserCategories(userId);
  }

  async removeCategory(userId: string, categoryId: string): Promise<void> {
    const userCategory = await prisma.userCategory.findUnique({
      where: { userId_categoryId: { userId, categoryId } },
    });

    if (!userCategory) {
      throw new AppError('Category not found in user profile', 404, ErrorCodes.NOT_FOUND);
    }

    await prisma.userCategory.delete({
      where: { userId_categoryId: { userId, categoryId } },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Removed category ${categoryId} from user: ${userId}`);
  }

  async setCategories(userId: string, categoryIds: string[]): Promise<CategoryResponse[]> {
    // Validate categories exist and are active
    if (categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds }, isActive: true },
      });

      if (categories.length !== categoryIds.length) {
        throw new AppError(
          'One or more categories not found or inactive',
          400,
          ErrorCodes.VALIDATION_FAILED
        );
      }
    }

    // Delete all existing categories and add new ones in a transaction
    await prisma.$transaction([
      prisma.userCategory.deleteMany({ where: { userId } }),
      prisma.userCategory.createMany({
        data: categoryIds.map((categoryId) => ({ userId, categoryId })),
      }),
    ]);

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Set ${categoryIds.length} categories for user: ${userId}`);
    return this.getUserCategories(userId);
  }

  // ==================== Experience ====================

  async getUserExperiences(userId: string): Promise<ExperienceResponse[]> {
    const experiences = await prisma.userExperience.findMany({
      where: { userId },
      orderBy: [{ isCurrent: 'desc' }, { endDate: 'desc' }, { startDate: 'desc' }],
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        createdAt: true,
      },
    });

    return experiences;
  }

  async createExperience(userId: string, data: CreateExperienceInput): Promise<ExperienceResponse> {
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    // Validate dates
    if (endDate && endDate < startDate) {
      throw new AppError('End date must be after start date', 400, ErrorCodes.VALIDATION_FAILED);
    }

    // If current, clear endDate
    const isCurrent = data.isCurrent ?? false;

    const experience = await prisma.userExperience.create({
      data: {
        userId,
        title: data.title,
        company: data.company,
        description: data.description,
        startDate,
        endDate: isCurrent ? null : endDate,
        isCurrent,
      },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        createdAt: true,
      },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Created experience ${experience.id} for user: ${userId}`);
    return experience;
  }

  async updateExperience(
    userId: string,
    experienceId: string,
    data: UpdateExperienceInput
  ): Promise<ExperienceResponse> {
    const experience = await prisma.userExperience.findFirst({
      where: { id: experienceId, userId },
    });

    if (!experience) {
      throw new AppError('Experience not found', 404, ErrorCodes.NOT_FOUND);
    }

    const startDate = data.startDate ? new Date(data.startDate) : experience.startDate;
    const endDate = data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : experience.endDate;
    const isCurrent = data.isCurrent ?? experience.isCurrent;

    // Validate dates
    if (endDate && endDate < startDate) {
      throw new AppError('End date must be after start date', 400, ErrorCodes.VALIDATION_FAILED);
    }

    const updated = await prisma.userExperience.update({
      where: { id: experienceId },
      data: {
        title: data.title,
        company: data.company,
        description: data.description,
        startDate,
        endDate: isCurrent ? null : endDate,
        isCurrent,
      },
      select: {
        id: true,
        title: true,
        company: true,
        description: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        createdAt: true,
      },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Updated experience ${experienceId} for user: ${userId}`);
    return updated;
  }

  async deleteExperience(userId: string, experienceId: string): Promise<void> {
    const experience = await prisma.userExperience.findFirst({
      where: { id: experienceId, userId },
    });

    if (!experience) {
      throw new AppError('Experience not found', 404, ErrorCodes.NOT_FOUND);
    }

    await prisma.userExperience.delete({
      where: { id: experienceId },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Deleted experience ${experienceId} for user: ${userId}`);
  }

  // ==================== Portfolio ====================

  async getUserPortfolio(userId: string): Promise<PortfolioResponse[]> {
    const portfolioItems = await prisma.userPortfolio.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    return portfolioItems;
  }

  async createPortfolioItem(
    userId: string,
    data: CreatePortfolioInput
  ): Promise<PortfolioResponse> {
    // Limit portfolio items (e.g., max 20)
    const count = await prisma.userPortfolio.count({ where: { userId } });
    if (count >= 20) {
      throw new AppError(
        'Maximum portfolio items limit reached (20)',
        400,
        ErrorCodes.VALIDATION_FAILED
      );
    }

    const item = await prisma.userPortfolio.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Created portfolio item ${item.id} for user: ${userId}`);
    return item;
  }

  async updatePortfolioItem(
    userId: string,
    itemId: string,
    data: UpdatePortfolioInput
  ): Promise<PortfolioResponse> {
    const item = await prisma.userPortfolio.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new AppError('Portfolio item not found', 404, ErrorCodes.NOT_FOUND);
    }

    const updated = await prisma.userPortfolio.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Updated portfolio item ${itemId} for user: ${userId}`);
    return updated;
  }

  async deletePortfolioItem(userId: string, itemId: string): Promise<void> {
    const item = await prisma.userPortfolio.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new AppError('Portfolio item not found', 404, ErrorCodes.NOT_FOUND);
    }

    await prisma.userPortfolio.delete({
      where: { id: itemId },
    });

    // Invalidate cache
    await cacheService.del(cacheKeys.userProfile(userId));

    logger.info(`Deleted portfolio item ${itemId} for user: ${userId}`);
  }
}

export const profileService = new ProfileService();
export default profileService;
