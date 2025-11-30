import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { healthCheck as redisHealthCheck } from '../config/redis';
import { sendSuccess } from '../utils/response';

const router = Router();

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
  };
}

router.get('/', async (_req: Request, res: Response) => {
  const startTime = process.uptime();

  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let redisStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  try {
    const isRedisHealthy = await redisHealthCheck();
    redisStatus = isRedisHealthy ? 'connected' : 'disconnected';
  } catch {
    redisStatus = 'disconnected';
  }

  const overallStatus =
    dbStatus === 'connected' && redisStatus === 'connected'
      ? 'ok'
      : dbStatus === 'connected' || redisStatus === 'connected'
        ? 'degraded'
        : 'error';

  const health: HealthStatus = {
    status: overallStatus,
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(startTime),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  };

  const statusCode = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return sendSuccess(res, health, undefined, statusCode);
});

router.get('/live', (_req: Request, res: Response) => {
  return sendSuccess(res, { status: 'alive' });
});

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const isRedisHealthy = await redisHealthCheck();

    if (!isRedisHealthy) {
      return res.status(503).json({ success: false, error: { message: 'Redis not ready' } });
    }

    return sendSuccess(res, { status: 'ready' });
  } catch {
    return res.status(503).json({ success: false, error: { message: 'Service not ready' } });
  }
});

export default router;
