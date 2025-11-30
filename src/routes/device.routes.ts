import { Router } from 'express';
import { deviceController } from '../controllers/device.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/devices - Register device token
router.post('/', deviceController.registerDevice.bind(deviceController));

// GET /api/devices - Get my devices
router.get('/', deviceController.getMyDevices.bind(deviceController));

// DELETE /api/devices - Remove device token
router.delete('/', deviceController.removeDevice.bind(deviceController));

// DELETE /api/devices/all - Remove all my devices
router.delete('/all', deviceController.removeAllDevices.bind(deviceController));

// PUT /api/devices/token - Update device token
router.put('/token', deviceController.updateToken.bind(deviceController));

export default router;
