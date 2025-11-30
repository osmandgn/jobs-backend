import { Router } from 'express';
import { skillController } from '../controllers/skill.controller';

const router = Router();

// Public routes
router.get('/', skillController.getAllSkills.bind(skillController));
router.get('/slug/:slug', skillController.getSkillBySlug.bind(skillController));
router.get('/:id', skillController.getSkillById.bind(skillController));

export default router;
