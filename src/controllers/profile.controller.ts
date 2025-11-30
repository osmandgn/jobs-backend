import { Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import { AppError, ErrorCodes } from '../utils/AppError';
import type {
  AddSkillsInput,
  SetSkillsInput,
  AddCategoriesInput,
  SetCategoriesInput,
  CreateExperienceInput,
  UpdateExperienceInput,
  CreatePortfolioInput,
  UpdatePortfolioInput,
} from '../validators/profile.validator';

export class ProfileController {
  // ==================== Skills ====================

  async getSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const skills = await profileService.getUserSkills(userId);
      sendSuccess(res, skills);
    } catch (error) {
      next(error);
    }
  }

  async addSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as AddSkillsInput;
      const skills = await profileService.addSkills(userId, data);
      sendSuccess(res, skills, 'Skills added successfully');
    } catch (error) {
      next(error);
    }
  }

  async setSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as SetSkillsInput;
      const skills = await profileService.setSkills(userId, data.skillIds);
      sendSuccess(res, skills, 'Skills updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { skillId } = req.params;
      if (!skillId) {
        throw new AppError('Skill ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      await profileService.removeSkill(userId, skillId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Categories ====================

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const categories = await profileService.getUserCategories(userId);
      sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async addCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as AddCategoriesInput;
      const categories = await profileService.addCategories(userId, data);
      sendSuccess(res, categories, 'Categories added successfully');
    } catch (error) {
      next(error);
    }
  }

  async setCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as SetCategoriesInput;
      const categories = await profileService.setCategories(userId, data.categoryIds);
      sendSuccess(res, categories, 'Categories updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { categoryId } = req.params;
      if (!categoryId) {
        throw new AppError('Category ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      await profileService.removeCategory(userId, categoryId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Experience ====================

  async getExperiences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const experiences = await profileService.getUserExperiences(userId);
      sendSuccess(res, experiences);
    } catch (error) {
      next(error);
    }
  }

  async createExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as CreateExperienceInput;
      const experience = await profileService.createExperience(userId, data);
      sendSuccess(res, experience, 'Experience added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { experienceId } = req.params;
      if (!experienceId) {
        throw new AppError('Experience ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      const data = req.body as UpdateExperienceInput;
      const experience = await profileService.updateExperience(userId, experienceId, data);
      sendSuccess(res, experience, 'Experience updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { experienceId } = req.params;
      if (!experienceId) {
        throw new AppError('Experience ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      await profileService.deleteExperience(userId, experienceId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Portfolio ====================

  async getPortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const portfolioItems = await profileService.getUserPortfolio(userId);
      sendSuccess(res, portfolioItems);
    } catch (error) {
      next(error);
    }
  }

  async createPortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const data = req.body as CreatePortfolioInput;
      const item = await profileService.createPortfolioItem(userId, data);
      sendSuccess(res, item, 'Portfolio item added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updatePortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { itemId } = req.params;
      if (!itemId) {
        throw new AppError('Portfolio item ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      const data = req.body as UpdatePortfolioInput;
      const item = await profileService.updatePortfolioItem(userId, itemId, data);
      sendSuccess(res, item, 'Portfolio item updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deletePortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { itemId } = req.params;
      if (!itemId) {
        throw new AppError('Portfolio item ID is required', 400, ErrorCodes.VALIDATION_FAILED);
      }

      await profileService.deletePortfolioItem(userId, itemId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const profileController = new ProfileController();
export default profileController;
