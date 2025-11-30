import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate';
import {
  addSkillsSchema,
  setSkillsSchema,
  addCategoriesSchema,
  setCategoriesSchema,
  createExperienceSchema,
  updateExperienceSchema,
  createPortfolioSchema,
  updatePortfolioSchema,
} from '../validators/profile.validator';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== Skills ====================
router.get(
  '/skills',
  profileController.getSkills.bind(profileController)
);

router.post(
  '/skills',
  validateBody(addSkillsSchema),
  profileController.addSkills.bind(profileController)
);

router.put(
  '/skills',
  validateBody(setSkillsSchema),
  profileController.setSkills.bind(profileController)
);

router.delete(
  '/skills/:skillId',
  profileController.removeSkill.bind(profileController)
);

// ==================== Categories ====================
router.get(
  '/categories',
  profileController.getCategories.bind(profileController)
);

router.post(
  '/categories',
  validateBody(addCategoriesSchema),
  profileController.addCategories.bind(profileController)
);

router.put(
  '/categories',
  validateBody(setCategoriesSchema),
  profileController.setCategories.bind(profileController)
);

router.delete(
  '/categories/:categoryId',
  profileController.removeCategory.bind(profileController)
);

// ==================== Experience ====================
router.get(
  '/experiences',
  profileController.getExperiences.bind(profileController)
);

router.post(
  '/experiences',
  validateBody(createExperienceSchema),
  profileController.createExperience.bind(profileController)
);

router.put(
  '/experiences/:experienceId',
  validateBody(updateExperienceSchema),
  profileController.updateExperience.bind(profileController)
);

router.delete(
  '/experiences/:experienceId',
  profileController.deleteExperience.bind(profileController)
);

// ==================== Portfolio ====================
router.get(
  '/portfolio',
  profileController.getPortfolio.bind(profileController)
);

router.post(
  '/portfolio',
  validateBody(createPortfolioSchema),
  profileController.createPortfolioItem.bind(profileController)
);

router.put(
  '/portfolio/:itemId',
  validateBody(updatePortfolioSchema),
  profileController.updatePortfolioItem.bind(profileController)
);

router.delete(
  '/portfolio/:itemId',
  profileController.deletePortfolioItem.bind(profileController)
);

export default router;
