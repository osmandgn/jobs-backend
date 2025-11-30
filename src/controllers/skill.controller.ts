import { Request, Response, NextFunction } from 'express';
import { skillService } from '../services/skill.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError, ErrorCodes } from '../utils/AppError';
import {
  createSkillSchema,
  updateSkillSchema,
  bulkCreateSkillsSchema,
  moveSkillsSchema,
} from '../validators/skill.validator';

class SkillController {
  /**
   * GET /api/v1/skills
   * Get all skills (optionally filtered by category)
   */
  async getAllSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, grouped } = req.query;

      if (categoryId && typeof categoryId === 'string') {
        // Get skills for specific category
        const skills = await skillService.getSkillsByCategory(categoryId);
        sendSuccess(res, skills, 'Beceriler başarıyla getirildi');
        return;
      }

      if (grouped === 'true') {
        // Get all skills grouped by category
        const groupedSkills = await skillService.getSkillsGroupedByCategory();
        sendSuccess(res, groupedSkills, 'Beceriler başarıyla getirildi');
        return;
      }

      // Get all skills flat list
      const skills = await skillService.getAllSkills();
      sendSuccess(res, skills, 'Beceriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/skills/:id
   * Get skill by ID
   */
  async getSkillById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Beceri ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      const skill = await skillService.getSkillById(id);

      if (!skill) {
        throw new NotFoundError('Beceri bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, skill, 'Beceri başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/skills/slug/:slug
   * Get skill by slug
   */
  async getSkillBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      if (!slug) {
        throw new BadRequestError('Beceri slug gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      const skill = await skillService.getSkillBySlug(slug);

      if (!skill) {
        throw new NotFoundError('Beceri bulunamadı', ErrorCodes.NOT_FOUND);
      }

      sendSuccess(res, skill, 'Beceri başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN METHODS ====================

  /**
   * GET /api/v1/admin/skills
   * Get all skills for admin
   */
  async getAllSkillsAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await skillService.getAllSkillsAdmin();
      sendSuccess(res, skills, 'Beceriler başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/skills
   * Create a new skill
   */
  async createSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = createSkillSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const skill = await skillService.createSkill(validation.data);
      sendSuccess(res, skill, 'Beceri başarıyla oluşturuldu', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/skills/:id
   * Update a skill
   */
  async updateSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Beceri ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }

      const validation = updateSkillSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const skill = await skillService.updateSkill(id, validation.data);
      sendSuccess(res, skill, 'Beceri başarıyla güncellendi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/skills/:id
   * Delete a skill
   */
  async deleteSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Beceri ID gereklidir', ErrorCodes.VALIDATION_FAILED);
      }
      await skillService.deleteSkill(id);
      sendSuccess(res, null, 'Beceri başarıyla silindi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/skills/bulk
   * Bulk create skills for a category
   */
  async bulkCreateSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = bulkCreateSkillsSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const result = await skillService.bulkCreateSkills(
        validation.data.categoryId,
        validation.data.skillNames
      );

      sendSuccess(res, result, `${result.created} beceri başarıyla oluşturuldu`, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/skills/move
   * Move skills to another category
   */
  async moveSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = moveSkillsSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const count = await skillService.moveSkillsToCategory(
        validation.data.skillIds,
        validation.data.targetCategoryId
      );

      sendSuccess(res, { movedCount: count }, `${count} beceri başarıyla taşındı`);
    } catch (error) {
      next(error);
    }
  }
}

export const skillController = new SkillController();
export default skillController;
