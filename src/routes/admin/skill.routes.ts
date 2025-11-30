import { Router } from 'express';
import { skillController } from '../../controllers/skill.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireAdmin } from '../../middlewares/role.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Admin skill routes
router.get('/', skillController.getAllSkillsAdmin.bind(skillController));
router.post('/', skillController.createSkill.bind(skillController));
router.post('/bulk', skillController.bulkCreateSkills.bind(skillController));
router.post('/move', skillController.moveSkills.bind(skillController));
router.put('/:id', skillController.updateSkill.bind(skillController));
router.delete('/:id', skillController.deleteSkill.bind(skillController));

export default router;
